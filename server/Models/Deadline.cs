using System.Text.Json.Serialization;
namespace time_tracker.Models
{
    public class Deadline
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public DateTime? ReminderDate { get; set; }
        
        public int? TaskId { get; set; }

        [JsonIgnore]
        public ProjectTask? Task { get; set; }
        
        public int? SubjectId { get; set; }

        [JsonIgnore]
        public Subject? Subject { get; set; }
        
        public int? CreatedById { get; set; }

        [JsonIgnore]
        public Student? CreatedBy { get; set; }
    }
}