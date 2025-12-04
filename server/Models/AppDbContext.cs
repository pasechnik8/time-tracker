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
        public DbSet<Result> Results { get; set; } = null!;
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Student - Team: 1 ко многим
            modelBuilder.Entity<Student>()
                .HasOne(s => s.Team)
                .WithMany(t => t.Members)
                .HasForeignKey(s => s.TeamId)
                .OnDelete(DeleteBehavior.SetNull);
                
            // ProjectTask - Student: 1 ко многим  
            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.AssignedStudent)
                .WithMany(s => s.AssignedTasks)
                .HasForeignKey(t => t.AssignedStudentId)
                .OnDelete(DeleteBehavior.SetNull);
                
            // ProjectTask - Subject: 1 ко многим
            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.Subject)
                .WithMany(s => s.Tasks)
                .HasForeignKey(t => t.SubjectId)
                .OnDelete(DeleteBehavior.SetNull);
                
            // Result - ProjectTask: 1 ко многим
            modelBuilder.Entity<Result>()
                .HasOne(r => r.Task)
                .WithMany(t => t.Results)
                .HasForeignKey(r => r.TaskId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Result - Student: 1 ко многим
            modelBuilder.Entity<Result>()
                .HasOne(r => r.Student)
                .WithMany(s => s.Results)
                .HasForeignKey(r => r.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Many-to-many для связей задач (Prerequisites)
            modelBuilder.Entity<ProjectTask>()
                .HasMany(t => t.Prerequisites)
                .WithMany()
                .UsingEntity<Dictionary<string, object>>(
                    "TaskPrerequisites",
                    j => j.HasOne<ProjectTask>().WithMany().HasForeignKey("PrerequisiteId"),
                    j => j.HasOne<ProjectTask>().WithMany().HasForeignKey("TaskId")
                );
        }
    }
}