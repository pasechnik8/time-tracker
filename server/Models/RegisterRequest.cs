using System.ComponentModel.DataAnnotations;

namespace time_tracker.Models
{
    public class RegisterRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;
        
        public StudentRole CurrentRole { get; set; } = StudentRole.Developer;
    }
}