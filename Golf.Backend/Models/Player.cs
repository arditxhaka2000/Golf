using System.ComponentModel.DataAnnotations;

namespace Golf.Backend.Models
{
    public class Player
    {
        public Guid Id { get; set; }
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public Gender Gender { get; set; }

        public decimal? CurrentHandicap { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<Round> Rounds { get; set; } = new List<Round>();
    }
    public enum Gender
    {
        Male,
        Female
    }
}
