using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace time_tracker.Models
{
    public class Result
    {
        public int Id { get; set; }

        // Связь с задачей
        [Required]
        public int TaskId { get; set; }
        [JsonIgnore]
        [ValidateNever]
        public ProjectTask Task { get; set; } = null!;

        // Связь со студентом
        [Required]
        public int StudentId { get; set; }
        [JsonIgnore]
        [ValidateNever]
        public Student Student { get; set; } = null!;

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