using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    [Table("Students")]
    public class Student
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        
        public int? TeamId { get; set; }
        
        [JsonIgnore]
        public Team? Team { get; set; }
        
        [JsonIgnore]
        public List<ProjectTask> AssignedTasks { get; set; } = new();
        
        public StudentRole CurrentRole { get; set; } = StudentRole.Developer;
    }

    public enum StudentRole
    {
        TeamLead,
        Developer,
        Designer,
        Tester,
        Analyst
    }
}