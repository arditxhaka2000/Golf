using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Golf.Backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Courses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CourseRating = table.Column<decimal>(type: "decimal(4,1)", precision: 4, scale: 1, nullable: false),
                    SlopeRating = table.Column<int>(type: "int", nullable: false),
                    ExternalApiId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Location = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Courses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrentHandicap = table.Column<decimal>(type: "decimal(3,1)", precision: 3, scale: 1, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Holes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CourseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HoleNumber = table.Column<int>(type: "int", nullable: false),
                    Par = table.Column<int>(type: "int", nullable: false),
                    Handicap = table.Column<int>(type: "int", nullable: false),
                    Yardage = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Holes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Holes_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Rounds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CourseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DatePlayed = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PlayerHandicapAtTime = table.Column<decimal>(type: "decimal(3,1)", precision: 3, scale: 1, nullable: true),
                    TotalStrokes = table.Column<int>(type: "int", nullable: false),
                    GrossScore = table.Column<int>(type: "int", nullable: false),
                    NetScore = table.Column<int>(type: "int", nullable: false),
                    HandicapDifferential = table.Column<decimal>(type: "decimal(4,1)", precision: 4, scale: 1, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rounds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Rounds_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Rounds_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoundHoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoundId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Strokes = table.Column<int>(type: "int", nullable: false),
                    AdditionalStrokes = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoundHoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoundHoles_Holes_HoleId",
                        column: x => x.HoleId,
                        principalTable: "Holes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RoundHoles_Rounds_RoundId",
                        column: x => x.RoundId,
                        principalTable: "Rounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Holes_CourseId",
                table: "Holes",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Players_UserId",
                table: "Players",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoundHoles_HoleId",
                table: "RoundHoles",
                column: "HoleId");

            migrationBuilder.CreateIndex(
                name: "IX_RoundHoles_RoundId",
                table: "RoundHoles",
                column: "RoundId");

            migrationBuilder.CreateIndex(
                name: "IX_Rounds_CourseId",
                table: "Rounds",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Rounds_PlayerId",
                table: "Rounds",
                column: "PlayerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoundHoles");

            migrationBuilder.DropTable(
                name: "Holes");

            migrationBuilder.DropTable(
                name: "Rounds");

            migrationBuilder.DropTable(
                name: "Courses");

            migrationBuilder.DropTable(
                name: "Players");
        }
    }
}
