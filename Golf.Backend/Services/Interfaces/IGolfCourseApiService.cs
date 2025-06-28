using Golf.Backend.Models;

namespace Golf.Backend.Services.Interfaces
{
    public interface IGolfCourseApiService
    {
        Task<List<CourseSearchResult>> SearchCoursesAsync(string name);
        Task<CourseDetails?> GetCourseDetailsAsync(string courseId);
    }

    public class CourseDetails
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal CourseRating { get; set; }
        public int SlopeRating { get; set; }
        public List<HoleDetails> Holes { get; set; } = new();
    }

    public class HoleDetails
    {
        public int Number { get; set; }
        public int Par { get; set; }
        public int Handicap { get; set; }
        public int? Yardage { get; internal set; }
    }
}
