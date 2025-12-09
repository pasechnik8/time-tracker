using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using time_tracker.Models;

namespace time_tracker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SubjectsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/subjects
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Subject>>> GetSubjects()
        {
            return await _context.Subjects
                .Include(s => s.Tasks)
                .ToListAsync();
        }

        // GET: api/subjects/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Subject>> GetSubject(int id)
        {
            var subject = await _context.Subjects.FindAsync(id);

            if (subject == null)
            {
                return NotFound();
            }

            return subject;
        }

        // POST: api/subjects
        [HttpPost]
        public async Task<ActionResult<Subject>> CreateSubject(Subject subject)
        {
            _context.Subjects.Add(subject);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSubject), new { id = subject.Id }, subject);
        }

        // PUT: api/subjects/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSubject(int id, Subject subject)
        {
            if (id != subject.Id)
            {
                return BadRequest();
            }

            var existing = await _context.Subjects.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Name = subject.Name;
            existing.Description = subject.Description;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/subjects/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            var subject = await _context.Subjects.FindAsync(id);
            if (subject == null)
            {
                return NotFound();
            }

            _context.Subjects.Remove(subject);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool SubjectExists(int id)
        {
            return _context.Subjects.Any(e => e.Id == id);
        }
    }
}
