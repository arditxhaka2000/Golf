using System.ComponentModel.DataAnnotations;

namespace Golf.Backend.Models
{
    public class Course
    {
        public Guid Id { get; set; } // Keep as Guid for consistency

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public decimal CourseRating { get; set; }
        public int SlopeRating { get; set; }

        [MaxLength(50)]
        public string? ExternalApiId { get; set; }

        [MaxLength(200)]
        public string? Location { get; set; }

        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<Hole> Holes { get; set; } = new List<Hole>();
        public virtual ICollection<Round> Rounds { get; set; } = new List<Round>();
    }
}
