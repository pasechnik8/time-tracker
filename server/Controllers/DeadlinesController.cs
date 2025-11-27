using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using time_tracker.Models;

namespace time_tracker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DeadlinesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DeadlinesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/deadlines
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Deadline>>> GetDeadlines()
        {
            return await _context.Deadlines
                .Include(d => d.Task)
                .Include(d => d.Subject)
                .Include(d => d.CreatedBy)
                .ToListAsync();
        }

        // GET: api/deadlines/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Deadline>> GetDeadline(int id)
        {
            var deadline = await _context.Deadlines
                .Include(d => d.Task)
                .Include(d => d.Subject)
                .Include(d => d.CreatedBy)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (deadline == null)
            {
                return NotFound();
            }

            return deadline;
        }

        // POST: api/deadlines
        [HttpPost]
        public async Task<ActionResult<Deadline>> CreateDeadline(Deadline deadline)
        {
            _context.Deadlines.Add(deadline);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDeadline), new { id = deadline.Id }, deadline);
        }

        // PUT: api/deadlines/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDeadline(int id, Deadline deadline)
        {
            if (id != deadline.Id)
            {
                return BadRequest();
            }

            var existing = await _context.Deadlines.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Title = deadline.Title;
            existing.DueDate = deadline.DueDate;
            existing.ReminderDate = deadline.ReminderDate;
            existing.TaskId = deadline.TaskId;
            existing.SubjectId = deadline.SubjectId;
            existing.CreatedById = deadline.CreatedById;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/deadlines/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDeadline(int id)
        {
            var deadline = await _context.Deadlines.FindAsync(id);
            if (deadline == null)
            {
                return NotFound();
            }

            _context.Deadlines.Remove(deadline);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/deadlines/upcoming - Предстоящие дедлайны
        [HttpGet("upcoming")]
        public async Task<ActionResult<IEnumerable<Deadline>>> GetUpcomingDeadlines()
        {
            var upcoming = await _context.Deadlines
                .Where(d => d.DueDate >= DateTime.Now && d.DueDate <= DateTime.Now.AddDays(7))
                .Include(d => d.Task)
                .Include(d => d.Subject)
                .OrderBy(d => d.DueDate)
                .ToListAsync();

            return upcoming;
        }

        private bool DeadlineExists(int id)
        {
            return _context.Deadlines.Any(e => e.Id == id);
        }
    }
}