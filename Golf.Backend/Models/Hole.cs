using System.ComponentModel.DataAnnotations;

namespace Golf.Backend.Models
{
    public class Hole
    {
        public Guid Id { get; set; }

        public int CourseId { get; set; }

        [Range(1, 18)]
        public int HoleNumber { get; set; }

        [Range(3, 5)]
        public int Par { get; set; }

        [Range(1, 18)]
        public int Handicap { get; set; }

        // Yardage information if available from API
        public int? Yardage { get; set; }

        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public virtual Course Course { get; set; } = null!;
        public virtual ICollection<RoundHole> RoundHoles { get; set; } = new List<RoundHole>();
    }
}
