using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using time_tracker.Models;

namespace time_tracker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TeamsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeamsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/teams
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Team>>> GetTeams()
        {
            return await _context.Teams
                .ToListAsync();
        }

        // GET: api/teams/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetTeam(int id)
        {
            var team = await _context.Teams
                .FirstOrDefaultAsync(t => t.Id == id);

            if (team == null)
            {
                return NotFound();
            }

            // Загружаем участников отдельно чтобы избежать циклов
            var members = await _context.Students.Where(s => s.TeamId == team.Id).ToListAsync();

            // Возвращаем объект вместе с членами через анонимный объект
            return Ok(new
            {
                id = team.Id,
                name = team.Name,
                description = team.Description,
                inviteCode = team.InviteCode,
                members = members.Select(m => new {
                    id = m.Id,
                    name = m.Name,
                    email = m.Email,
                    teamId = m.TeamId,
                    currentRole = m.CurrentRole
                })
            });
        }

        // POST: api/teams
        [HttpPost]
        public async Task<ActionResult<Team>> CreateTeam(Team team)
        {
            _context.Teams.Add(team);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTeam), new { id = team.Id }, team);
        }

        // PUT: api/teams/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTeam(int id, Team team)
        {
            if (id != team.Id)
            {
                return BadRequest();
            }

            var existing = await _context.Teams.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Name = team.Name;
            existing.Description = team.Description;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/teams/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeam(int id)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null)
            {
                return NotFound();
            }

            // Отвязываем участников (если есть) — опционально
            var members = await _context.Students.Where(s => s.TeamId == id).ToListAsync();
            foreach (var m in members)
            {
                m.TeamId = null;
            }

            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/teams/{teamId}/join/{studentId} - Добавить студента в команду
        [HttpPost("{teamId}/join/{studentId}")]
        public async Task<IActionResult> JoinTeam(int teamId, int studentId)
        {
            var team = await _context.Teams.FindAsync(teamId);
            var student = await _context.Students.FindAsync(studentId);

            if (team == null || student == null)
            {
                return NotFound();
            }

            if (student.TeamId != null && student.TeamId != teamId)
            {
                return BadRequest(new { message = "Студент уже состоит в другой команде" });
            }

            student.TeamId = teamId;
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Студент добавлен в команду",
                teamId = team.Id,
                teamName = team.Name 
            });
        }

        // GET: api/teams/invite/{inviteCode} - Найти команду по коду приглашения
        [HttpGet("invite/{inviteCode}")]
        public async Task<ActionResult<object>> GetTeamByInviteCode(string inviteCode)
        {
            var team = await _context.Teams
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Description,
                    t.InviteCode,
                    MemberCount = t.Members.Count
                })
                .FirstOrDefaultAsync(t => t.InviteCode == inviteCode);

            if (team == null)
            {
                return NotFound(new { message = "Команда не найдена" });
            }

            return Ok(team);
        }

        // POST: api/teams/join-by-code - Присоединиться к команде по коду приглашения
        [HttpPost("join-by-code")]
        public async Task<ActionResult<object>> JoinTeamByInviteCode([FromBody] JoinByCodeRequest request)
        {
            // 1. Находим команду по коду
            var team = await _context.Teams
                .FirstOrDefaultAsync(t => t.InviteCode == request.InviteCode);
            
            if (team == null)
            {
                return NotFound(new { message = "Команда с таким кодом не найдена" });
            }

            // 2. Находим студента
            var student = await _context.Students.FindAsync(request.StudentId);
            if (student == null)
            {
                return NotFound(new { message = "Студент не найден" });
            }

            // 3. Проверяем, не состоит ли уже в команде
            if (student.TeamId.HasValue)
            {
                return BadRequest(new { message = "Вы уже состоите в команде" });
            }

            // 4. Присоединяем
            student.TeamId = team.Id;
            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                message = $"Вы присоединились к команде '{team.Name}'",
                teamId = team.Id,
                teamName = team.Name
            });
        }

        // GET: api/teams/{teamId}/all-tasks - Все задачи студентов команды
        [HttpGet("{teamId}/all-tasks")]
        public async Task<ActionResult<IEnumerable<ProjectTask>>> GetAllTasksForTeam(int teamId)
        {
            // Получаем всех студентов команды
            var teamStudents = await _context.Students
                .Where(s => s.TeamId == teamId)
                .Select(s => s.Id)
                .ToListAsync();

            if (!teamStudents.Any())
            {
                return new List<ProjectTask>();
            }

            // Получаем задачи всех этих студентов
            var teamTasks = await _context.Tasks
                .Where(t => t.AssignedStudentId.HasValue && teamStudents.Contains(t.AssignedStudentId.Value))
                .Include(t => t.AssignedStudent)
                .Include(t => t.Subject)
                .ToListAsync();

            return teamTasks;
        }

        private bool TeamExists(int id)
        {
            return _context.Teams.Any(e => e.Id == id);
        }
    }

    // DTO для запроса присоединения по коду
    public class JoinByCodeRequest
    {
        public string InviteCode { get; set; } = string.Empty;
        public int StudentId { get; set; }
    }
}