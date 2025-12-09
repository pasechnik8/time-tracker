using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class Result
    {
        public int Id { get; set; }

        // Связь с задачей
        public int TaskId { get; set; }
        [JsonIgnore]
        public ProjectTask Task { get; set; } = null!;

        // Связь со студентом
        public int StudentId { get; set; }
        [JsonIgnore]
        public Student Student { get; set; } = null!;

        // Статус выполнения
        public bool IsCompleted { get; set; } = false;

        // Дата завершения
        public DateTime? CompletedAt { get; set; }
    }
}