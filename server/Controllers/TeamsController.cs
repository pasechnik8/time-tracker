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
            return await _context.Teams.Include(t => t.Members).ToListAsync();
        }

        // GET: api/teams/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Team>> GetTeam(int id)
        {
            var team = await _context.Teams
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (team == null)
            {
                return NotFound();
            }

            return team;
        }

        // POST: api/teams
        [HttpPost]
        public async Task<ActionResult<Team>> CreateTeam(Team team)
        {
            // Генерируем уникальный код приглашения
            team.InviteCode = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
            
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

            _context.Entry(team).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TeamExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

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

            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/teams/1/join/5 - Добавить студента в команду
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

            return Ok(new { message = "Студент добавлен в команду" });
        }

        // GET: api/teams/1/tasks - Получить все задачи команды
        [HttpGet("{teamId}/tasks")]
        public async Task<ActionResult<IEnumerable<ProjectTask>>> GetTeamTasks(int teamId)
        {
            var teamTasks = await _context.Students
                .Where(s => s.TeamId == teamId)
                .SelectMany(s => s.AssignedTasks)
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
}