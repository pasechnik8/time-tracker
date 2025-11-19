using System.Text.Json.Serialization;
namespace time_tracker.Models
{
    public class Result
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public ResultType Type { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public int? TaskId { get; set; }

        [JsonIgnore]
        public ProjectTask? Task { get; set; } = null!;
        
        public int? PrerequisiteResultId { get; set; } // для иерархии результатов

        [JsonIgnore]
        public Result? PrerequisiteResult { get; set; }
    }

    public enum ResultType
    {
        TopicResult,    // результат по конкретной теме
        ProjectResult   // результат по всему проекту
    }
}