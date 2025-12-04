using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using time_tracker.Models;

namespace time_tracker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/tasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectTask>>> GetTasks()
        {
            return await _context.Tasks
                .Include(t => t.Subject)
                .Include(t => t.AssignedStudent)
                .ToListAsync();
        }

        // GET: api/tasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ProjectTask>> GetTask(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.Subject)
                .Include(t => t.AssignedStudent)
                .Include(t => t.Prerequisites)
                .Include(t => t.Deadlines)
                .Include(t => t.Results)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
            {
                return NotFound();
            }

            return task;
        }

        // POST: api/tasks
        [HttpPost]
        public async Task<ActionResult<ProjectTask>> CreateTask(ProjectTask task)
        {
            task.Id = 0;
            task.CreatedAt = DateTime.UtcNow;
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
        }

        // PUT: api/tasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, ProjectTask task)
        {
            if (id != task.Id)
            {
                return BadRequest();
            }

            var existing = await _context.Tasks.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Title = task.Title;
            existing.Description = task.Description;
            existing.Deadline = task.Deadline;
            existing.SubjectId = task.SubjectId;
            existing.AssignedStudentId = task.AssignedStudentId;
            existing.TeamId = task.TeamId;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/tasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
            {
                return NotFound();
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/tasks/{taskId}/assign/{studentId} - Назначить задачу студенту
        [HttpPost("{taskId}/assign/{studentId}")]
        public async Task<IActionResult> AssignTask(int taskId, int studentId)
        {
            var task = await _context.Tasks.FindAsync(taskId);
            var student = await _context.Students.FindAsync(studentId);

            if (task == null || student == null)
            {
                return NotFound();
            }

            task.AssignedStudentId = studentId;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Задача назначена студенту" });
        }

        // GET: api/tasks/student/5 - Задачи студента
        [HttpGet("student/{studentId}")]
        public async Task<ActionResult<IEnumerable<ProjectTask>>> GetStudentTasks(int studentId)
        {
            var tasks = await _context.Tasks
                .Where(t => t.AssignedStudentId == studentId)
                .Include(t => t.Subject)
                .ToListAsync();

            return tasks;
        }

        // GET: api/tasks/team/5 - Задачи команды (по полю TeamId)
        [HttpGet("team/{teamId}")]
        public async Task<ActionResult<IEnumerable<ProjectTask>>> GetTeamTasks(int teamId)
        {
            var teamTasks = await _context.Tasks
                .Where(t => t.TeamId == teamId)
                .Include(t => t.AssignedStudent)
                .Include(t => t.Subject)
                .ToListAsync();

            return teamTasks;
        }

        private bool TaskExists(int id)
        {
            return _context.Tasks.Any(e => e.Id == id);
        }
    }
}
