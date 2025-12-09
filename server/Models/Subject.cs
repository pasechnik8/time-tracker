using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class Subject
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        
        // [JsonIgnore]
        public List<ProjectTask> Tasks { get; set; } = new();
    }
}