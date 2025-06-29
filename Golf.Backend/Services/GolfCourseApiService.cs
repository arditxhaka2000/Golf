// Golf.Backend/Services/GolfCourseApiService.cs

using Azure.Core;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text.Json.Serialization;

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

            if (!string.IsNullOrEmpty(_options.ApiKey))
            {
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Key {_options.ApiKey}");
            }
        }

        public async Task<List<CourseSearchResult>> SearchCoursesAsync(string name)
        {
            try
            {
                if (string.IsNullOrEmpty(_options.ApiKey))
                {
                    return new List<CourseSearchResult>();
                }

                var url = $"{_options.BaseUrl}/v1/search?search_query={Uri.EscapeDataString(name)}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning($"API search failed: {response.StatusCode}");
                    return new List<CourseSearchResult>();
                }

                var json = await response.Content.ReadAsStringAsync();
                var searchResponse = JsonSerializer.Deserialize<ApiCourseSearchResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (searchResponse?.Courses != null)
                {
                    return searchResponse.Courses.Select(MapToCourseSearchResult).ToList();
                }

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
                if (string.IsNullOrEmpty(_options.ApiKey))
                {
                    return null;
                }

                var url = $"{_options.BaseUrl}/v1/courses/{courseId}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning($"Course details API failed: {response.StatusCode}");
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                var apiResponse = JsonSerializer.Deserialize<ApiCourseResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var apiCourse = apiResponse?.Course;

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
                return GenerateStandardHoles();
            }

            return apiHoles.Select((hole, index) => new HoleDetails
            {
                Number = index + 1,
                Par = hole.Par ?? 4,
                Handicap = hole.Handicap ?? (index + 1),
                Yardage = hole.Yardage
            }).ToList();
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

      

        // API model classes
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

    public class GolfCourseApiOptions
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
    }
}