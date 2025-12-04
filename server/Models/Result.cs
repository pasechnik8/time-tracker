using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class Result
    {
        public int Id { get; set; }

        // Связь с задачей
        public int TaskId { get; set; }
        [JsonIgnore]
        public ProjectTask Task { get; set; }

        // Связь со студентом
        public int StudentId { get; set; }
        [JsonIgnore]
        public Student Student { get; set; }

        // Статус выполнения
        public bool IsCompleted { get; set; } = false;

        // Дата завершения (если выполнено)
        public DateTime? CompletedAt { get; set; }

        // Оценка 
        public int? Grade { get; set; }

        // Комментарий
        public string? Comment { get; set; }
    }
}