using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using time_tracker.Models;

namespace time_tracker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<ActionResult<object>> Register(RegisterRequest request)
        {
            // Проверяем, не зарегистрирован ли уже студент с таким email
            if (await _context.Students.AnyAsync(s => s.Email == request.Email))
            {
                return BadRequest(new { message = "Пользователь с таким email уже существует" });
            }

            var student = new Student
            {
                Name = request.Name,
                Email = request.Email,
                PasswordHash = HashPassword(request.Password),
                CurrentRole = request.CurrentRole
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(student);
            
            return Ok(new
            {
                token,
                student = new
                {
                    student.Id,
                    student.Name,
                    student.Email,
                    student.CurrentRole,
                    student.TeamId
                }
            });
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<ActionResult<object>> Login(LoginRequest request)
        {
            var student = await _context.Students
                .Include(s => s.Team)
                .FirstOrDefaultAsync(s => s.Email == request.Email);

            if (student == null || !VerifyPassword(request.Password, student.PasswordHash))
            {
                return Unauthorized(new { message = "Неверный email или пароль" });
            }

            var token = GenerateJwtToken(student);
            
            return Ok(new
            {
                token,
                student = new
                {
                    student.Id,
                    student.Name,
                    student.Email,
                    student.CurrentRole,
                    student.TeamId,
                    teamName = student.Team?.Name
                }
            });
        }

        // GET: api/auth/profile - Получить профиль текущего пользователя
        [HttpGet("profile")]
        public async Task<ActionResult<object>> GetProfile()
        {
            var studentId = GetCurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var student = await _context.Students
                .Include(s => s.Team)
                .FirstOrDefaultAsync(s => s.Id == studentId);

            if (student == null)
            {
                return NotFound();
            }

            return new
            {
                student.Id,
                student.Name,
                student.Email,
                student.CurrentRole,
                student.TeamId,
                teamName = student.Team?.Name
            };
        }

        // Вспомогательные методы
        private string HashPassword(string password)
        {

            var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") 
                   ?? _configuration["Jwt:Secret"];
    
            if (string.IsNullOrEmpty(jwtSecret))
            {
                jwtSecret = "fallback-secret";
            }

            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(password + jwtSecret);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        private bool VerifyPassword(string password, string passwordHash)
        {
            var hash = HashPassword(password);
            return hash == passwordHash;
        }

        private string GenerateJwtToken(Student student)
        {

            var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") 
                   ?? _configuration["Jwt:Secret"];
    
            if (string.IsNullOrEmpty(jwtSecret))
            {
                throw new InvalidOperationException("JWT Secret not configured in environment variables or appsettings.json");
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, student.Id.ToString()),
                new Claim(ClaimTypes.Name, student.Name),
                new Claim(ClaimTypes.Email, student.Email),
                new Claim(ClaimTypes.Role, student.CurrentRole.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private int? GetCurrentStudentId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            return null;
        }
    }
}