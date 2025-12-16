using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    [Table("Tasks")]
    public class ProjectTask
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? Deadline { get; set; }

        public bool IsCompleted { get; set; } = false;

        public DateTime? CompletedAt { get; set; }

        [JsonIgnore]
        public List<ProjectTask> Prerequisites { get; set; } = new();

        public int? SubjectId { get; set; }
        
        [JsonIgnore]
        public Subject? Subject { get; set; }

        public int? AssignedStudentId { get; set; }
        
        [JsonIgnore]
        public Student? AssignedStudent { get; set; }
    }
}