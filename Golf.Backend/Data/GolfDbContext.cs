using Golf.Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Golf.Backend.Data
{
    public class GolfDbContext : DbContext
    {
        public GolfDbContext(DbContextOptions<GolfDbContext> options) : base(options)
        {
        }

        public DbSet<Player> Players { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Hole> Holes { get; set; }
        public DbSet<Round> Rounds { get; set; }
        public DbSet<RoundHole> RoundHoles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Player configuration
            modelBuilder.Entity<Player>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.UserId).IsRequired().HasMaxLength(100);
                entity.Property(p => p.Name).IsRequired().HasMaxLength(100);
                entity.Property(p => p.Gender).IsRequired().HasConversion<string>();
                entity.Property(p => p.CurrentHandicap).HasPrecision(3, 1);
                entity.HasIndex(p => p.UserId).IsUnique();
            });

            // Course configuration
            modelBuilder.Entity<Course>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Name).IsRequired().HasMaxLength(200);
                entity.Property(c => c.CourseRating).HasPrecision(4, 1);
                entity.Property(c => c.ExternalApiId).HasMaxLength(50);
                entity.Property(c => c.Location).HasMaxLength(200);
            });

            // Hole configuration
            modelBuilder.Entity<Hole>(entity =>
            {
                entity.HasKey(h => h.Id);
                entity.Property(h => h.HoleNumber).IsRequired();
                entity.Property(h => h.Par).IsRequired();
                entity.Property(h => h.Handicap).IsRequired();

                entity.HasOne(h => h.Course)
                    .WithMany(c => c.Holes)
                    .HasForeignKey(h => h.CourseId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Round configuration
            modelBuilder.Entity<Round>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.Property(r => r.PlayerHandicapAtTime).HasPrecision(3, 1);
                entity.Property(r => r.HandicapDifferential).HasPrecision(4, 1);

                entity.HasOne(r => r.Player)
                    .WithMany(p => p.Rounds)
                    .HasForeignKey(r => r.PlayerId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(r => r.Course)
                    .WithMany(c => c.Rounds)
                    .HasForeignKey(r => r.CourseId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // RoundHole configuration
            modelBuilder.Entity<RoundHole>(entity =>
            {
                entity.HasKey(rh => rh.Id);

                entity.HasOne(rh => rh.Round)
                    .WithMany(r => r.RoundHoles)
                    .HasForeignKey(rh => rh.RoundId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(rh => rh.Hole)
                    .WithMany(h => h.RoundHoles)
                    .HasForeignKey(rh => rh.HoleId)
                    .OnDelete(DeleteBehavior.Restrict); // Prevent deleting holes if rounds exist
            });
        }
    }
}