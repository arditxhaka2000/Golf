﻿// Golf.Backend/Services/CourseService.cs
// Updated to properly handle fallback course imports

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

        public async Task<Course?> GetCourseAsync(Guid id)
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
            var localCourses = await _context.Courses
                .Include(c => c.Holes.OrderBy(h => h.HoleNumber))
                .Where(c => c.Name.Contains(name))
                .ToListAsync();

            var results = new List<CourseSearchResult>();

            // Add local courses
            foreach (var localCourse in localCourses)
            {
                results.Add(new CourseSearchResult
                {
                    Id = localCourse.Id,
                    Name = localCourse.Name,
                    Location = localCourse.Location ?? string.Empty,
                    ExternalApiId = localCourse.ExternalApiId,
                    CourseRating = localCourse.CourseRating,
                    SlopeRating = localCourse.SlopeRating,
                    IsImported = true,
                    IsFromApi = !string.IsNullOrEmpty(localCourse.ExternalApiId),
                    Holes = localCourse.Holes.ToList()
                });
            }

            // Add API courses
            try
            {
                var apiResults = await _apiService.SearchCoursesAsync(name);
                foreach (var apiCourse in apiResults)
                {
                    // Skip if we already have this course locally
                    if (!localCourses.Any(c => c.ExternalApiId == apiCourse.ExternalApiId))
                    {
                        results.Add(apiCourse);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching external API for courses: {Name}", name);
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
            // Check if course already exists in database
            var existingCourse = await GetCourseByExternalIdAsync(externalId);
            if (existingCourse != null)
            {
                _logger.LogInformation("Course already exists in database: {CourseName}", existingCourse.Name);
                return existingCourse;
            }

            // Handle both API and fallback courses through the API service
            var courseDetails = await _apiService.GetCourseDetailsAsync(externalId);
            if (courseDetails == null)
            {
                throw new ArgumentException($"Course with external ID {externalId} not found in API or fallback data");
            }

            // For fallback courses, they should already be created by the API service
            // Check again if it was created during the GetCourseDetailsAsync call
            existingCourse = await GetCourseByExternalIdAsync(externalId);
            if (existingCourse != null)
            {
                _logger.LogInformation("Fallback course was created during API call: {CourseName}", existingCourse.Name);
                return existingCourse;
            }

            // If still not found, this is a regular API course - create it
            _logger.LogInformation("Creating new API course: {CourseName}", courseDetails.Name);

            var course = new Course
            {
                Id = Guid.NewGuid(),
                Name = courseDetails.Name,
                CourseRating = courseDetails.CourseRating,
                SlopeRating = courseDetails.SlopeRating,
                Location = string.Empty, // Will be populated from API if available
                ExternalApiId = externalId,
                CreatedAt = DateTime.UtcNow
            };

            foreach (var holeDetail in courseDetails.Holes)
            {
                var hole = new Hole
                {
                    Id = Guid.NewGuid(),
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
}