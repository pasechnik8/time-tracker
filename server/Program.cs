using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using time_tracker.Models;

var builder = WebApplication.CreateBuilder(args);

// Конфигурация порта
// builder.WebHost.UseUrls("http://localhost:5000");

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://*:{port}");

// Конфигурация JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Конфигурация CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500", "https://*.app.timeweb.cloud", "https://pasechnik8-time-tracker-ed6d.twc1.net/#", "https://pasechnik8-time-tracker-ed6d.twc1.net")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Конфигурация базы данных

var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION") 
                     ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Database connection string is not configured");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ===== ДОБАВЛЯЕМ JWT АУТЕНТИФИКАЦИЮ =====
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{

    var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") 
                   ?? builder.Configuration["Jwt:Secret"];
    
    if (string.IsNullOrEmpty(jwtSecret))
    {
        throw new InvalidOperationException("JWT Secret is not configured");
    }

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "time-tracker",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "time-tracker-users",
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Создание базы данных при запуске
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    
    try
    {
        db.Database.Migrate();
        Console.WriteLine("Database migrated successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error migrating database: {ex.Message}");
    }
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "TeamTracker API V1");
    options.RoutePrefix = "swagger";
});

app.MapControllers();

app.MapGet("/", () => "Командный трекер часов");

app.Run();