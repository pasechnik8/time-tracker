using Microsoft.EntityFrameworkCore;
using time_tracker.Models;

namespace time_tracker.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        
        public DbSet<Student> Students { get; set; } = null!;
        public DbSet<Subject> Subjects { get; set; } = null!;
        public DbSet<ProjectTask> Tasks { get; set; } = null!;
        public DbSet<Team> Teams { get; set; } = null!;
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Student - Team: 1 ко многим
            modelBuilder.Entity<Student>(entity =>
            {
                entity.HasOne(s => s.Team)
                    .WithMany(t => t.Members)
                    .HasForeignKey(s => s.TeamId)
                    .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.TeamId);
            });
                
            // ProjectTask - Student: 1 ко многим  
            modelBuilder.Entity<ProjectTask>(entity =>
            {
                entity.HasOne(t => t.AssignedStudent)
                    .WithMany(s => s.AssignedTasks)
                    .HasForeignKey(t => t.AssignedStudentId)
                    .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasIndex(e => e.AssignedStudentId);
                entity.HasIndex(e => e.SubjectId);
                entity.HasIndex(e => e.IsCompleted);
                entity.HasIndex(e => e.Deadline);
            });
                
            // ProjectTask - Subject: 1 ко многим
            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.Subject)
                .WithMany(s => s.Tasks)
                .HasForeignKey(t => t.SubjectId)
                .OnDelete(DeleteBehavior.SetNull);
                
            modelBuilder.Entity<ProjectTask>()
                .HasMany(t => t.Prerequisites)
                .WithMany()
                .UsingEntity<Dictionary<string, object>>(
                    "TaskPrerequisites",
                    j => j
                        .HasOne<ProjectTask>()
                        .WithMany()
                        .HasForeignKey("PrerequisiteId")
                        .OnDelete(DeleteBehavior.Cascade),
                    j => j
                        .HasOne<ProjectTask>()
                        .WithMany()
                        .HasForeignKey("TaskId")
                        .OnDelete(DeleteBehavior.Cascade),
                    j =>
                    {
                        j.HasKey("TaskId", "PrerequisiteId");
                        j.HasIndex("PrerequisiteId");
                    }
                );
        }
    }
}