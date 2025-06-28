using Golf.Backend.Data;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Golf.Backend.Services
{
    public class CourseService : ICourseService
    {
        private readonly GolfDbContext _context;
        private readonly IGolfCourseApiService _apiService;
        private readonly ILogger<CourseService> _logger;

        public CourseService(GolfDbContext context, IGolfCourseApiService apiService, ILogger<CourseService> logger)
        {
            _context = context;
            _apiService = apiService;
            _logger = logger;
        }

        public async Task<Course?> GetCourseAsync(int id)
        {
            return await _context.Courses
                .Include(c => c.Holes.OrderBy(h => h.HoleNumber))
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<IEnumerable<Course>> GetCoursesAsync()
        {
            return await _context.Courses
                .Include(c => c.Holes.OrderBy(h => h.HoleNumber))
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<CourseSearchResult>> SearchCoursesAsync(string name)
        {
            // First search local database
            var localCourses = await _context.Courses
                .Include(c => c.Holes.OrderBy(h => h.HoleNumber))
                .Where(c => c.Name.Contains(name))
                .ToListAsync();

            var results = new List<CourseSearchResult>();

            // Add local courses to results
            foreach (var localCourse in localCourses)
            {
                results.Add(new CourseSearchResult
                {
                    Id = localCourse.Id, // Real GUID from database
                    Name = localCourse.Name,
                    Location = localCourse.Location,
                    ExternalApiId = localCourse.ExternalApiId,
                    CourseRating = localCourse.CourseRating,
                    SlopeRating = localCourse.SlopeRating,
                    IsImported = true, // It's in our database
                    IsFromApi = !string.IsNullOrEmpty(localCourse.ExternalApiId),
                    Holes = localCourse.Holes.ToList()
                });
            }

            // Then search API and add to results
            try
            {
                var apiResults = await _apiService.SearchCoursesAsync(name);

                foreach (var apiCourse in apiResults)
                {
                    // Check if course already exists locally
                    if (!localCourses.Any(c => c.ExternalApiId == apiCourse.Id.ToString()))
                    {
                        results.Add(new CourseSearchResult
                        {
                            Id = apiCourse.Id,
                            Name = apiCourse.Name,
                            Location = apiCourse.Location,
                            ExternalApiId = apiCourse.Id.ToString(), // Use API ID for import operations
                            CourseRating = 0, // Will be populated when imported
                            SlopeRating = 0,
                            IsImported = false, // Not in our database yet
                            IsFromApi = true, // Comes from external API
                            Holes = new List<Hole>()
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching external API for courses: {Name}", name);
                // Still return local results if API fails
            }

            return results;
        }
        public async Task<Course?> GetCourseByExternalIdAsync(string externalId)
        {
            return await _context.Courses
                .Include(c => c.Holes)
                .FirstOrDefaultAsync(c => c.ExternalApiId == externalId);
        }
        public async Task<Course> ImportCourseFromApiAsync(string externalId)
        {
            // Check if course already exists
            var existingCourse = await _context.Courses
                .Include(c => c.Holes)
                .FirstOrDefaultAsync(c => c.ExternalApiId == externalId);

            if (existingCourse != null)
            {
                return existingCourse;
            }

            // Get course details from API
            var courseDetails = await _apiService.GetCourseDetailsAsync(externalId);
            if (courseDetails == null)
            {
                throw new ArgumentException($"Course with external ID {externalId} not found");
            }

            // Create new course
            var course = new Course
            {
                Name = courseDetails.Name,
                CourseRating = courseDetails.CourseRating,
                SlopeRating = courseDetails.SlopeRating,
                ExternalApiId = externalId,
                CreatedAt = DateTime.UtcNow
            };

            // Create holes
            foreach (var holeDetail in courseDetails.Holes)
            {
                var hole = new Hole
                {
                    CourseId = course.Id,
                    HoleNumber = holeDetail.Number,
                    Par = holeDetail.Par,
                    Handicap = holeDetail.Handicap,
                    Yardage = holeDetail.Yardage,
                    CreatedAt = DateTime.UtcNow
                };
                course.Holes.Add(hole);
            }

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Successfully imported course: {CourseName} (ID: {ExternalId})", course.Name, externalId);
            return course;
        }
    }
    public class CourseSearchResult
    {
        public int Id { get; set; } // Null for API courses not yet imported
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? ExternalApiId { get; set; }
        public decimal CourseRating { get; set; }
        public decimal SlopeRating { get; set; }
        public bool IsImported { get; set; } // True if it's in local DB
        public bool IsFromApi { get; set; } // True if it comes from API
        public List<Hole> Holes { get; set; } = new();
    }
}
