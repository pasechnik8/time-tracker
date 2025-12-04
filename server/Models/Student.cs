using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class Student
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        
        public int? TeamId { get; set; }
        [JsonIgnore]
        public Team? Team { get; set; }
        
        [JsonIgnore]
        public List<ProjectTask> AssignedTasks { get; set; } = new();

        [JsonIgnore]
        public List<Result> Results { get; set; } = new();
        
        public StudentRole CurrentRole { get; set; }
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