using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace time_tracker.Models
{
    public class Team
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; } = string.Empty;
        public string InviteCode { get; set; } = GenerateInviteCode();
        
        [JsonIgnore]
        public List<Student> Members { get; set; } = new();
        
        private static string GenerateInviteCode()
        {
            return Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
        }
    }
}