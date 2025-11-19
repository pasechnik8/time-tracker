using Microsoft.EntityFrameworkCore;
using time_tracker.Models;

namespace time_tracker.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        
        public DbSet<Student> Students { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<ProjectTask> Tasks { get; set; }
        public DbSet<Team> Teams { get; set; }
        public DbSet<Deadline> Deadlines { get; set; }
        public DbSet<Result> Results { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Student - Team: 1 ко многим (студент в одной команде, у команды много студентов)
            modelBuilder.Entity<Student>()
                .HasOne(s => s.Team)
                .WithMany(t => t.Members)
                .HasForeignKey(s => s.TeamId);

            // ProjectTask - Subject: 1 ко многим
            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.Subject)
                .WithMany(s => s.Tasks)
                .HasForeignKey(t => t.SubjectId);
                
            // ProjectTask - Student: 1 ко многим  
            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.AssignedStudent)
                .WithMany(s => s.AssignedTasks)
                .HasForeignKey(t => t.AssignedStudentId);

            // Deadline - Student: 1 ко многим
            modelBuilder.Entity<Deadline>()
                .HasOne(d => d.CreatedBy)
                .WithMany(s => s.CreatedDeadlines)
                .HasForeignKey(d => d.CreatedById);

            // Result - ProjectTask: 1 ко многим
            modelBuilder.Entity<Result>()
                .HasOne(r => r.Task)
                .WithMany(t => t.Results)
                .HasForeignKey(r => r.TaskId);

            // ProjectTask - ProjectTask: многие ко многим 
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