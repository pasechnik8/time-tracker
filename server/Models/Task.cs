using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class ProjectTask
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public TaskStatus Status { get; set; } = TaskStatus.Pending;
         [JsonIgnore]

        public List<ProjectTask> Prerequisites { get; set; } = new();

        public int? SubjectId { get; set; }
         [JsonIgnore]
        public Subject? Subject { get; set; }

        public int? AssignedStudentId { get; set; }
         [JsonIgnore]
        public Student? AssignedStudent { get; set; }
    }

    public enum TaskStatus
    {
        Pending = 0,
        InProgress = 1,
        Completed = 2
    }
}