using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class ProjectTask
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        // Дедлайн задачи
        public DateTime? Deadline { get; set; }

        // Команда, к которой прикреплена задача
        public int? TeamId { get; set; }

        // Ссылки на необходимые задачи
        [JsonIgnore]
        public List<ProjectTask> Prerequisites { get; set; } = new();

        // Внешние ключи
        public int? SubjectId { get; set; }
        [JsonIgnore]
        public Subject? Subject { get; set; }

        // Связь со студентом
        public int? AssignedStudentId { get; set; }
        [JsonIgnore]
        public Student? AssignedStudent { get; set; }

        [JsonIgnore]
        public List<Result> Results { get; set; } = new();
    }
}
