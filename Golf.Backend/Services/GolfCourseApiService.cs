// Golf.Backend/Services/GolfCourseApiService.cs
// Enhanced with comprehensive API limitations mitigation strategies
// REQ 1-3: Implement mitigation strategies for API limitations

using Azure.Core;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

namespace Golf.Backend.Services
{
    public class GolfCourseApiService : IGolfCourseApiService
    {
        private readonly HttpClient _httpClient;
        private readonly GolfCourseApiOptions _options;
        private readonly ILogger<GolfCourseApiService> _logger;
        private readonly IMemoryCache _cache;

        // MITIGATION 1: Rate limiting and request tracking
        private static readonly Dictionary<string, DateTime> _lastRequestTimes = new();
        private static readonly object _rateLimitLock = new object();
        private const int MinimumRequestIntervalMs = 1000; // 1 second between requests

        // MITIGATION 2: Circuit breaker pattern
        private DateTime _circuitBreakerLastFailure = DateTime.MinValue;
        private int _consecutiveFailures = 0;
        private const int MaxConsecutiveFailures = 3;
        private const int CircuitBreakerTimeoutMinutes = 5;

        public GolfCourseApiService(
            HttpClient httpClient,
            IOptions<GolfCourseApiOptions> options,
            ILogger<GolfCourseApiService> logger,
            IMemoryCache cache)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
            _cache = cache;

            if (!string.IsNullOrEmpty(_options.ApiKey))
            {
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Key {_options.ApiKey}");
            }

            // MITIGATION 3: Set reasonable timeouts
            _httpClient.Timeout = TimeSpan.FromSeconds(10);
        }

        public async Task<List<CourseSearchResult>> SearchCoursesAsync(string name)
        {
            // MITIGATION 4: Input validation and normalization
            if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
            {
                _logger.LogWarning("Invalid search term provided: {SearchTerm}", name);
                return new List<CourseSearchResult>();
            }

            var normalizedName = name.Trim().ToLowerInvariant();
            var cacheKey = $"course_search_{normalizedName}";

            try
            {
                // MITIGATION 5: Caching strategy
                if (_cache.TryGetValue(cacheKey, out List<CourseSearchResult>? cachedResults))
                {
                    _logger.LogInformation("Returning cached search results for: {SearchTerm}", name);
                    return cachedResults ?? new List<CourseSearchResult>();
                }

                // Check if API is available
                if (!IsApiAvailable())
                {
                    _logger.LogWarning("API is not available for search: {SearchTerm}", name);
                    return new List<CourseSearchResult>();
                }

                // MITIGATION 6: Rate limiting
                await EnforceRateLimit();

                var url = $"{_options.BaseUrl}/v1/search?search_query={Uri.EscapeDataString(name)}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    await HandleApiFailure($"API search failed with status: {response.StatusCode}");
                    return new List<CourseSearchResult>();
                }

                var json = await response.Content.ReadAsStringAsync();
                var searchResponse = JsonSerializer.Deserialize<ApiCourseSearchResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var results = new List<CourseSearchResult>();

                if (searchResponse?.Courses != null)
                {
                    results = searchResponse.Courses.Select(MapToCourseSearchResult).ToList();
                }

                // Cache successful results
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24), // Cache for 24 hours
                    SlidingExpiration = TimeSpan.FromHours(4) // Extend if accessed within 4 hours
                };
                _cache.Set(cacheKey, results, cacheOptions);

                // Reset circuit breaker on success
                ResetCircuitBreaker();

                _logger.LogInformation("Successfully retrieved {Count} courses for search: {SearchTerm}", results.Count, name);
                return results;
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
            {
                await HandleApiFailure($"API request timeout for search: {name}");
                return new List<CourseSearchResult>();
            }
            catch (HttpRequestException ex)
            {
                await HandleApiFailure($"Network error during course search: {ex.Message}");
                return new List<CourseSearchResult>();
            }
            catch (Exception ex)
            {
                await HandleApiFailure($"Unexpected error during course search: {ex.Message}");
                return new List<CourseSearchResult>();
            }
        }

        public async Task<CourseDetails?> GetCourseDetailsAsync(string courseId)
        {
            var cacheKey = $"course_details_{courseId}";

            try
            {
                // Check cache first
                if (_cache.TryGetValue(cacheKey, out CourseDetails? cachedDetails))
                {
                    _logger.LogInformation("Returning cached course details for: {CourseId}", courseId);
                    return cachedDetails;
                }

                if (!IsApiAvailable())
                {
                    _logger.LogWarning("API not available for course details: {CourseId}", courseId);
                    return null;
                }

                await EnforceRateLimit();

                var url = $"{_options.BaseUrl}/v1/courses/{courseId}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    await HandleApiFailure($"Course details API failed: {response.StatusCode}");
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                var apiResponse = JsonSerializer.Deserialize<ApiCourseResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var apiCourse = apiResponse?.Course;
                if (apiCourse == null)
                {
                    _logger.LogWarning("No course data returned from API for: {CourseId}", courseId);
                    return null;
                }

                var courseDetails = MapToCourseDetails(apiCourse);

                // Cache successful results for longer (course details change rarely)
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7), // Cache for 7 days
                    Priority = CacheItemPriority.High
                };
                _cache.Set(cacheKey, courseDetails, cacheOptions);

                ResetCircuitBreaker();
                return courseDetails;
            }
            catch (Exception ex)
            {
                await HandleApiFailure($"Error getting course details: {ex.Message}");
                return null;
            }
        }

        // MITIGATION HELPER METHODS

        private bool IsApiAvailable()
        {
            // Check if API key is configured
            if (string.IsNullOrEmpty(_options.ApiKey))
            {
                _logger.LogWarning("API key not configured");
                return false;
            }

            // Check circuit breaker
            if (_consecutiveFailures >= MaxConsecutiveFailures)
            {
                var timeSinceLastFailure = DateTime.UtcNow - _circuitBreakerLastFailure;
                if (timeSinceLastFailure < TimeSpan.FromMinutes(CircuitBreakerTimeoutMinutes))
                {
                    _logger.LogWarning("Circuit breaker is open. API unavailable for {Minutes} more minutes",
                        (CircuitBreakerTimeoutMinutes - timeSinceLastFailure.TotalMinutes));
                    return false;
                }
                else
                {
                    // Reset circuit breaker after timeout
                    _consecutiveFailures = 0;
                    _logger.LogInformation("Circuit breaker reset. Attempting API call.");
                }
            }

            return true;
        }

        private async Task EnforceRateLimit()
        {
            lock (_rateLimitLock)
            {
                var now = DateTime.UtcNow;
                var clientId = _options.ApiKey ?? "default";

                if (_lastRequestTimes.TryGetValue(clientId, out var lastRequest))
                {
                    var timeSinceLastRequest = now - lastRequest;
                    var waitTime = TimeSpan.FromMilliseconds(MinimumRequestIntervalMs) - timeSinceLastRequest;

                    if (waitTime.TotalMilliseconds > 0)
                    {
                        _logger.LogDebug("Rate limiting: waiting {Ms}ms before next request", waitTime.TotalMilliseconds);
                        Thread.Sleep(waitTime);
                    }
                }

                _lastRequestTimes[clientId] = DateTime.UtcNow;
            }
        }

        private async Task HandleApiFailure(string errorMessage)
        {
            _consecutiveFailures++;
            _circuitBreakerLastFailure = DateTime.UtcNow;

            _logger.LogError("API Failure #{Count}: {Error}", _consecutiveFailures, errorMessage);

            if (_consecutiveFailures >= MaxConsecutiveFailures)
            {
                _logger.LogWarning("Circuit breaker opened after {Count} consecutive failures", _consecutiveFailures);
            }
        }

        private void ResetCircuitBreaker()
        {
            if (_consecutiveFailures > 0)
            {
                _logger.LogInformation("Circuit breaker reset after successful API call");
                _consecutiveFailures = 0;
            }
        }

        // Existing mapping methods remain the same...
        private CourseSearchResult MapToCourseSearchResult(ApiCourse apiCourse)
        {
            string courseName;

            if (!string.IsNullOrEmpty(apiCourse.CourseName) && !string.IsNullOrEmpty(apiCourse.ClubName))
            {
                if (apiCourse.CourseName.Equals(apiCourse.ClubName, StringComparison.OrdinalIgnoreCase))
                {
                    courseName = apiCourse.ClubName;
                }
                else
                {
                    courseName = $"{apiCourse.ClubName} - {apiCourse.CourseName}";
                }
            }
            else
            {
                courseName = apiCourse.ClubName ?? apiCourse.CourseName ?? "Unknown Course";
            }

            var teeBox = GetBestTeeBox(apiCourse.Tees);

            return new CourseSearchResult
            {
                Id = null,
                Name = courseName,
                Location = apiCourse.Location?.Address ?? string.Empty,
                ExternalApiId = apiCourse.Id.ToString(),
                IsImported = false,
                IsFromApi = true,
                CourseRating = (decimal)(teeBox?.CourseRating ?? 72.0),
                SlopeRating = teeBox?.SlopeRating ?? 113,
                Holes = new List<Hole>()
            };
        }

        private CourseDetails MapToCourseDetails(ApiCourse apiCourse)
        {
            var teeBox = GetBestTeeBox(apiCourse.Tees);

            return new CourseDetails
            {
                Id = apiCourse.Id.ToString(),
                Name = $"{apiCourse.ClubName} - {apiCourse.CourseName}".Trim(' ', '-'),
                CourseRating = (decimal)(teeBox?.CourseRating ?? 72.0),
                SlopeRating = teeBox?.SlopeRating ?? 113,
                Holes = MapHoles(teeBox?.Holes)
            };
        }

        private ApiTeeBox? GetBestTeeBox(ApiTees? tees)
        {
            if (tees == null) return null;

            var availableTees = tees.Male?.Concat(tees.Female ?? new List<ApiTeeBox>()) ?? tees.Female;
            if (availableTees == null || !availableTees.Any()) return null;

            return availableTees.FirstOrDefault(t =>
                t.TeeName?.Contains("Blue", StringComparison.OrdinalIgnoreCase) == true ||
                t.TeeName?.Contains("White", StringComparison.OrdinalIgnoreCase) == true ||
                t.TeeName?.Contains("Gold", StringComparison.OrdinalIgnoreCase) == true)
                ?? availableTees.First();
        }

        private List<HoleDetails> MapHoles(List<ApiHole>? apiHoles)
        {
            if (apiHoles == null || apiHoles.Count == 0)
            {
                return GenerateStandardHoles().Select(h => new HoleDetails
                {
                    Number = h.HoleNumber,
                    Par = h.Par,
                    Handicap = h.Handicap,
                    Yardage = 150 + (h.Par - 3) * 100
                }).ToList();
            }

            return apiHoles.Select((hole, index) => new HoleDetails
            {
                Number = index + 1,
                Par = hole.Par ?? 4,
                Handicap = hole.Handicap ?? (index + 1),
                Yardage = hole.Yardage
            }).ToList();
        }

        private List<Hole> GenerateStandardHoles()
        {
            var pars = new[] { 4, 3, 5, 4, 4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5 };

            return Enumerable.Range(1, 18)
                .Select(i => new Hole
                {
                    HoleNumber = i,
                    Par = pars[i - 1],
                    Handicap = i
                })
                .ToList();
        }

        // API model classes remain the same...
        private class ApiCourseSearchResponse
        {
            public List<ApiCourse>? Courses { get; set; }
        }

        private class ApiCourseResponse
        {
            public ApiCourse? Course { get; set; }
        }

        private class ApiCourse
        {
            public int Id { get; set; }

            [JsonPropertyName("club_name")]
            public string? ClubName { get; set; }

            [JsonPropertyName("course_name")]
            public string? CourseName { get; set; }

            public ApiLocation? Location { get; set; }
            public ApiTees? Tees { get; set; }
        }

        private class ApiLocation
        {
            public string Address { get; set; } = string.Empty;
        }

        private class ApiTees
        {
            public List<ApiTeeBox>? Female { get; set; }
            public List<ApiTeeBox>? Male { get; set; }
        }

        private class ApiTeeBox
        {
            [JsonPropertyName("tee_name")]
            public string? TeeName { get; set; }

            [JsonPropertyName("course_rating")]
            public float? CourseRating { get; set; }

            [JsonPropertyName("slope_rating")]
            public int? SlopeRating { get; set; }

            public List<ApiHole>? Holes { get; set; }
        }

        private class ApiHole
        {
            public int? Par { get; set; }
            public int? Yardage { get; set; }
            public int? Handicap { get; set; }
        }
    }

    // Enhanced configuration options
    public class GolfCourseApiOptions
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public int RateLimitMs { get; set; } = 1000;
        public int CircuitBreakerThreshold { get; set; } = 3;
        public int CircuitBreakerTimeoutMinutes { get; set; } = 5;
        public int CacheExpiryHours { get; set; } = 24;
    }
}