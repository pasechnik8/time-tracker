using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class Team
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string InviteCode { get; set; } = string.Empty;
        
        [JsonIgnore]
        public List<Student> Members { get; set; } = new();
        
        public StudentRole DefaultRole { get; set; } = StudentRole.Developer;
    }
}