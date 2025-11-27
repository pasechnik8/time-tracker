using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using time_tracker.Models;

namespace time_tracker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ResultsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ResultsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/results
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Result>>> GetResults()
        {
            return await _context.Results
                .Include(r => r.Task)
                .Include(r => r.PrerequisiteResult)
                .ToListAsync();
        }

        // GET: api/results/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Result>> GetResult(int id)
        {
            var result = await _context.Results
                .Include(r => r.Task)
                .Include(r => r.PrerequisiteResult)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (result == null)
            {
                return NotFound();
            }

            return result;
        }

        // POST: api/results
        [HttpPost]
        public async Task<ActionResult<Result>> CreateResult(Result result)
        {
            result.CreatedAt = DateTime.UtcNow;
            _context.Results.Add(result);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetResult), new { id = result.Id }, result);
        }

        // PUT: api/results/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateResult(int id, Result result)
        {
            if (id != result.Id)
            {
                return BadRequest();
            }

            var existing = await _context.Results.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Title = result.Title;
            existing.Description = result.Description;
            existing.Type = result.Type;
            existing.TaskId = result.TaskId;
            existing.PrerequisiteResultId = result.PrerequisiteResultId;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/results/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteResult(int id)
        {
            var result = await _context.Results.FindAsync(id);
            if (result == null)
            {
                return NotFound();
            }

            _context.Results.Remove(result);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/results/task/5 - Результаты по задаче
        [HttpGet("task/{taskId}")]
        public async Task<ActionResult<IEnumerable<Result>>> GetResultsByTask(int taskId)
        {
            var results = await _context.Results
                .Where(r => r.TaskId == taskId)
                .Include(r => r.PrerequisiteResult)
                .ToListAsync();

            return results;
        }

        private bool ResultExists(int id)
        {
            return _context.Results.Any(e => e.Id == id);
        }
    }
}