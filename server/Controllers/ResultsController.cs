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

        // GET: api/results/task/5 - Результаты по конкретной задаче
        [HttpGet("task/{taskId}")]
        public async Task<ActionResult<IEnumerable<Result>>> GetResultsByTask(int taskId)
        {
            var results = await _context.Results
                .Where(r => r.TaskId == taskId)
                .Include(r => r.Student)
                .ToListAsync();

            return results;
        }

        // POST: api/results/toggle/{taskId} - Просто переключить статус задачи
        [HttpPost("toggle/{taskId}")]
        public async Task<ActionResult<object>> ToggleTaskCompletion(int taskId)
        {
            // Проверяем существует ли задача
            var task = await _context.Tasks.FindAsync(taskId);
            if (task == null)
            {
                return NotFound("Задача не найдена");
            }

            // Ищем любой существующий результат для этой задачи
            var existingResult = await _context.Results
                .FirstOrDefaultAsync(r => r.TaskId == taskId);

            Result result;
            
            if (existingResult == null)
            {
                // Создаем новый результат
                // Если задача назначена студенту, используем его ID, иначе создаем с ID=1
                var studentId = task.AssignedStudentId ?? 1;
                
                result = new Result
                {
                    TaskId = taskId,
                    StudentId = studentId,
                    IsCompleted = true,
                    CompletedAt = DateTime.UtcNow
                };
                _context.Results.Add(result);
            }
            else
            {
                // Переключаем статус существующего результата
                result = existingResult;
                result.IsCompleted = !result.IsCompleted;
                result.CompletedAt = result.IsCompleted ? DateTime.UtcNow : null;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                result.Id,
                result.TaskId,
                result.StudentId,
                result.IsCompleted,
                result.CompletedAt
            });
        }

        // GET: api/results/status/{taskId} - Проверить статус задачи
        [HttpGet("status/{taskId}")]
        public async Task<ActionResult<bool>> GetTaskStatus(int taskId)
        {
            var result = await _context.Results
                .FirstOrDefaultAsync(r => r.TaskId == taskId);
            
            return Ok(result?.IsCompleted ?? false);
        }
    }
}