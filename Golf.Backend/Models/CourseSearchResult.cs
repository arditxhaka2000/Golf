namespace Golf.Backend.Models
{
    public class CourseSearchResult
    {
        public Guid? Id { get; set; } // Nullable for API courses
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? ExternalApiId { get; set; }
        public decimal CourseRating { get; set; }
        public decimal SlopeRating { get; set; }
        public bool IsImported { get; set; }
        public bool IsFromApi { get; set; }
        public List<Hole> Holes { get; set; } = new();
    }
}
