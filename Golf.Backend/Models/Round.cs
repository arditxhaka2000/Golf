namespace Golf.Backend.Models
{
    public class Round
    {
        public Guid Id { get; set; }
        public Guid PlayerId { get; set; }
        public Guid CourseId { get; set; } // Keep as Guid

        public DateTime DatePlayed { get; set; }
        public decimal? PlayerHandicapAtTime { get; set; }

        public int TotalStrokes { get; set; }
        public int GrossScore { get; set; }
        public int NetScore { get; set; }
        public decimal HandicapDifferential { get; set; }

        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public virtual Player Player { get; set; } = null!;
        public virtual Course Course { get; set; } = null!;
        public virtual ICollection<RoundHole> RoundHoles { get; set; } = new List<RoundHole>();
    }
}
