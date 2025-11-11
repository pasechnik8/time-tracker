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
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
             modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.Subject)
                .WithMany(s => s.Tasks)
                .HasForeignKey(t => t.SubjectId);
                
            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.AssignedStudent)
                .WithMany(s => s.AssignedTasks)
                .HasForeignKey(t => t.AssignedStudentId);
        }
    }
}