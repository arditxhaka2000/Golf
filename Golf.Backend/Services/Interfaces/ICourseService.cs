using Golf.Backend.Models;

namespace Golf.Backend.Services.Interfaces
{
    public interface ICourseService
    {
        Task<Course?> GetCourseAsync(Guid id);
        Task<IEnumerable<Course>> GetCoursesAsync();
        Task<IEnumerable<CourseSearchResult>> SearchCoursesAsync(string name);
        Task<Course> ImportCourseFromApiAsync(string externalId);
        Task<Course?> GetCourseByExternalIdAsync(string externalId);
    }
}
