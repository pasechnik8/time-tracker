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
                .Include(r => r.Student)
                .ToListAsync();
        }

        // GET: api/results/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Result>> GetResult(int id)
        {
            var result = await _context.Results
                .Include(r => r.Task)
                .Include(r => r.Student)
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
            // Проверяем существование задачи и студента
            var taskExists = await _context.Tasks.AnyAsync(t => t.Id == result.TaskId);
            var studentExists = await _context.Students.AnyAsync(s => s.Id == result.StudentId);
            
            if (!taskExists || !studentExists)
            {
                return BadRequest("Task or Student does not exist.");
            }

            // Проверяем, не существует ли уже результат для этой пары (студент + задача)
            var existingResult = await _context.Results
                .FirstOrDefaultAsync(r => r.TaskId == result.TaskId && r.StudentId == result.StudentId);
            
            if (existingResult != null)
            {
                return Conflict("Result for this task and student already exists.");
            }

             if (result.IsCompleted && result.CompletedAt == null)
            {
                result.CompletedAt = DateTime.UtcNow;
            }

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

            // Обновляем только необходимые поля
            existing.IsCompleted = result.IsCompleted;
            existing.CompletedAt = result.IsCompleted ? result.CompletedAt ?? DateTime.UtcNow : null;
            existing.Grade = result.Grade;
            existing.Comment = result.Comment;
            // TaskId и StudentId обычно не изменяются, так как это связь

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
                .Include(r => r.Student)
                .ToListAsync();

            return results;
        }

        // GET: api/results/student/5 - Результаты по студенту
        [HttpGet("student/{studentId}")]
        public async Task<ActionResult<IEnumerable<Result>>> GetResultsByStudent(int studentId)
        {
            var results = await _context.Results
                .Where(r => r.StudentId == studentId)
                .Include(r => r.Task)
                .ToListAsync();

            return results;
        }

        // GET: api/results/student/5/task/10 - Конкретный результат студента по задаче
        [HttpGet("student/{studentId}/task/{taskId}")]
        public async Task<ActionResult<Result>> GetResultByStudentAndTask(int studentId, int taskId)
        {
            var result = await _context.Results
                .Include(r => r.Task)
                .Include(r => r.Student)
                .FirstOrDefaultAsync(r => r.StudentId == studentId && r.TaskId == taskId);

            if (result == null)
            {
                return NotFound();
            }

            return result;
        }

        private bool ResultExists(int id)
        {
            return _context.Results.Any(e => e.Id == id);
        }
    }
}