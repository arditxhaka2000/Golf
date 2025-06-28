namespace Golf.Backend.Models
{
    public class RoundHole
    {
        public Guid Id { get; set; }

        public Guid RoundId { get; set; }
        public Guid HoleId { get; set; }

        public int Strokes { get; set; }
        public int AdditionalStrokes { get; set; } = 0;

        // Navigation properties
        public virtual Round Round { get; set; } = null!;
        public virtual Hole Hole { get; set; } = null!;
    }
}
