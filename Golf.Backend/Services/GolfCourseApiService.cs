// Golf.Backend/Services/GolfCourseApiService.cs

using Azure.Core;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Golf.Backend.Services
{
    public class GolfCourseApiService : IGolfCourseApiService
    {
        private readonly HttpClient _httpClient;
        private readonly GolfCourseApiOptions _options;
        private readonly ILogger<GolfCourseApiService> _logger;

        public GolfCourseApiService(HttpClient httpClient, IOptions<GolfCourseApiOptions> options, ILogger<GolfCourseApiService> logger)
            
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;

            // Set up the correct authorization header: "Authorization: Key <your API key>"
            if (!string.IsNullOrEmpty(_options.ApiKey))
            {
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Key {_options.ApiKey}");
            }
        }

        public async Task<List<CourseSearchResult>> SearchCoursesAsync(string name)
        {
            try
            {
                _logger.LogInformation($"Searching for courses with name: {name}");

                // Check if API key is available
                if (string.IsNullOrEmpty(_options.ApiKey))
                {
                    _logger.LogWarning("No API key configured. Course search unavailable.");
                    return new List<CourseSearchResult>();
                }

                // Use the correct endpoint: /v1/search with search_query parameter
                var url = $"{_options.BaseUrl}/v1/search?search_query={Uri.EscapeDataString(name)}";

                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning($"API request failed: {response.StatusCode} - {errorContent}");
                    return new List<CourseSearchResult>();
                }

                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"API Response: {json}");

                
                var searchResponse = JsonSerializer.Deserialize<ApiCourseSearchResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (searchResponse?.Courses != null)
                {
                    return searchResponse.Courses.Select(MapToCourseSearchResult).ToList();
                }

                _logger.LogWarning("API returned empty or invalid response");
                return new List<CourseSearchResult>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error searching courses: {ex.Message}");
                return new List<CourseSearchResult>();
            }
        }

        public async Task<CourseDetails?> GetCourseDetailsAsync(string courseId)
        {
            try
            {
                _logger.LogInformation($"Getting course details for ID: {courseId}");

                // Check if API key is available
                if (string.IsNullOrEmpty(_options.ApiKey))
                {
                    _logger.LogWarning("No API key configured. Course details unavailable.");
                    return null;
                }

                // Use the correct endpoint: /v1/courses/{id}
                var url = $"{_options.BaseUrl}/v1/courses/{courseId}?api_key={_options.ApiKey}";
                var response = await _httpClient.GetAsync(url);

                _logger.LogInformation($"API Response Status: {response.StatusCode}");

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning($"Course details API request failed: {response.StatusCode} - {errorContent}");
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"Course details API Response: {json}");

                var apiCourse = JsonSerializer.Deserialize<ApiCourse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (apiCourse != null)
                {
                    return MapToCourseDetails(apiCourse);
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting course details: {ex.Message}");
                return null;
            }
        }

        private CourseSearchResult MapToCourseSearchResult(ApiCourse apiCourse)
        {
            return new CourseSearchResult
            {
                Name = string.IsNullOrEmpty(apiCourse.CourseName)
                    ? apiCourse.ClubName
                    : $"{apiCourse.ClubName} - {apiCourse.CourseName}".Trim(' ', '-'),
                Location = apiCourse.Location?.Address ?? string.Empty,
                ExternalApiId = apiCourse.Id.ToString(), // Convert int to string
                IsImported = false,
                IsFromApi = true,
                CourseRating = 0,
                SlopeRating = 0,
                Holes = new List<Hole>()
            };
        }

        private CourseDetails MapToCourseDetails(ApiCourse apiCourse)
        {
            // Get the first available tee box (preferably male blue/white tees)
            var teeBox = GetBestTeeBox(apiCourse.Tees);

            return new CourseDetails
            {
                Id = apiCourse.Id.ToString() ?? Guid.NewGuid().ToString(),
                Name = $"{apiCourse.ClubName} - {apiCourse.CourseName}".Trim(' ', '-'),
                CourseRating = (decimal)(teeBox?.CourseRating ?? 72.0),
                SlopeRating = teeBox?.SlopeRating ?? 113,
                Holes = MapHoles(teeBox?.Holes)
            };
        }

        private string FormatLocation(ApiLocation? location)
        {
            if (location == null) return "Unknown Location";

            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(location.City)) parts.Add(location.City);
            if (!string.IsNullOrWhiteSpace(location.State)) parts.Add(location.State);
            if (!string.IsNullOrWhiteSpace(location.Country)) parts.Add(location.Country);

            return parts.Count > 0 ? string.Join(", ", parts) : "Unknown Location";
        }

        private ApiTeeBox? GetBestTeeBox(ApiTees? tees)
        {
            if (tees == null) return null;

            // Prefer male tees first, then female tees
            var availableTees = tees.Male?.Concat(tees.Female ?? new List<ApiTeeBox>()) ?? tees.Female;

            if (availableTees == null || !availableTees.Any()) return null;

            // Prefer standard tees (Blue, White, Gold) over extreme tees (Black, Red)
            var preferredTee = availableTees.FirstOrDefault(t =>
                t.TeeName?.Contains("Blue", StringComparison.OrdinalIgnoreCase) == true ||
                t.TeeName?.Contains("White", StringComparison.OrdinalIgnoreCase) == true ||
                t.TeeName?.Contains("Gold", StringComparison.OrdinalIgnoreCase) == true)
                ?? availableTees.First();

            return preferredTee;
        }

        private List<HoleDetails> MapHoles(List<ApiHole>? apiHoles)
        {
            if (apiHoles == null || apiHoles.Count == 0)
            {
                return GenerateStandardHoles();
            }

            return apiHoles.Select((hole, index) => new HoleDetails
            {
                Number = index + 1, // Holes are usually 1-indexed
                Par = hole.Par ?? 4,
                Handicap = hole.Handicap ?? (index + 1), // Default handicap based on hole number
                Yardage = hole.Yardage
            }).ToList();
        }

        
        private class ApiCourseSearchResponse
        {
            public List<ApiCourse>? Courses { get; set; }
        }

        private class ApiCourse
        {
            public int Id { get; set; }
            public string? ClubName { get; set; }
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
            public string? TeeName { get; set; }
            public float? CourseRating { get; set; }
            public int? SlopeRating { get; set; }
            public float? BogeyRating { get; set; }
            public int? TotalYards { get; set; }
            public int? TotalMeters { get; set; }
            public int? NumberOfHoles { get; set; }
            public int? ParTotal { get; set; }
            public List<ApiHole>? Holes { get; set; }
        }

        private class ApiHole
        {
            public int? Par { get; set; }
            public int? Yardage { get; set; }
            public int? Handicap { get; set; }
        }

        private List<HoleDetails> GenerateStandardHoles()
        {
            var pars = new[] { 4, 3, 5, 4, 4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5 };

            return Enumerable.Range(1, 18)
                .Select(i => new HoleDetails
                {
                    Number = i,
                    Par = pars[i - 1],
                    Handicap = i,
                    Yardage = pars[i - 1] == 3 ? 150 : pars[i - 1] == 4 ? 350 : 500
                })
                .ToList();
        }
    }

    public class GolfCourseApiOptions
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
    }
}