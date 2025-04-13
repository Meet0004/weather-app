const apiKey = "60d523c59ff15fbd4067e8b87c28627f";
//current time
function updateCurrentTime() {
    const now = new Date();
    const timeElement = document.getElementById('currentTime');
    timeElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();

async function getWeather() {
    const city = document.getElementById("cityInput").value;
    const result = document.getElementById("result");

    if (!city) {
        result.innerHTML = `
          <div class="error-container">
            <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
            <h3 class="error-title">Location Required</h3>
            <p class="error-message">Please enter a city name to get weather information</p>
            <button class="retry-btn" onclick="getWeather()">Try Again</button>
          </div>
        `;
        return;
    }

    result.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Fetching weather data for ${city}...</div>
        </div>
    `;

    try {
    // 1. Get coordinates from city name using Geocoding API
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
    const geoData = await geoRes.json();

    if (geoData.length === 0) {
        result.innerHTML = `
            <div class="error-container">
              <div class="error-icon"><i class="fas fa-map-marker-alt"></i></div>
              <h3 class="error-title">Location Not Found</h3>
              <p class="error-message">We couldn't find "${city}". Please try another location.</p>
              <button class="retry-btn" onclick="getWeather()">Search Again</button>
            </div>
        `;
        return;
    }

    const { lat, lon, name, country } = geoData[0];

    // 2. Get current weather and forecast using coordinates
    const [weatherRes, forecastRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
    ]);
    
    const [currentData, forecastData] = await Promise.all([
        weatherRes.json(),
        forecastRes.json()
    ]);

    // hourly forecast data (next 12 hours)
    const hourlyForecast = forecastData.list.slice(0, 4).map(item => {
        const time = new Date(item.dt * 1000);
        return {
            time: time.toLocaleTimeString([], { hour: '2-digit' }),
            temp: Math.round(item.main.temp),
            icon: item.weather[0].icon,
            description: item.weather[0].description
        };
    });

    //  daily forecast data (next 5 days)
    const dailyForecast = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dailyData = {};
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toDateString();
        
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                date,
                temps: [],
                icons: [],
                descriptions: []
            };
        }

        dailyData[dayKey].temps.push(item.main.temp);
        dailyData[dayKey].icons.push(item.weather[0].icon);
        dailyData[dayKey].descriptions.push(item.weather[0].description);
    });
    
    // each day
    let dayCount = 0;
    for (const dayKey in dailyData) {
        if (dayCount >= 5) break;
        
        const dayData = dailyData[dayKey];
        const dayName = days[dayData.date.getDay()];
        const high = Math.round(Math.max(...dayData.temps));
        const low = Math.round(Math.min(...dayData.temps));
        
        const iconCounts = {};
        let mostFrequentIcon = dayData.icons[0];
        let maxCount = 1;
        
        dayData.icons.forEach(icon => {
            if (iconCounts[icon]) {
                iconCounts[icon]++;
            } else {
                iconCounts[icon] = 1;
            }

            if (iconCounts[icon] > maxCount) {
                mostFrequentIcon = icon;
                maxCount = iconCounts[icon];
            }
        });

        dailyForecast.push({
            day: dayName,
            high,
            low,
            icon: mostFrequentIcon
        });

        dayCount++;
    }
    const timezoneOffset = currentData.timezone;
    const localTime = new Date(Date.now() + timezoneOffset * 1000);
    const formattedTime = localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = localTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

    result.innerHTML = `
        <div class="main-content">
            <div class="current-weather">
                <div class="weather-header">
                    <div class="location-info">
                        <h2>${name}</h2>
                        <p>${formattedDate}</p>
                    </div>
                    <div class="current-time">${formattedTime}</div>
                </div>
              
                <div class="weather-main">
                    <div class="temperature-container">
                        <div class="current-temp">${Math.round(currentData.main.temp)}</div>
                        <div class="temp-unit">°C</div>
                    </div>
                    <div class="weather-icon-container">
                        <div class="weather-icon-bg"></div>
                        <img src="https://openweathermap.org/img/wn/${currentData.weather[0].icon}@4x.png" 
                             alt="${currentData.weather[0].description}" 
                             class="weather-icon">
                    </div>
                </div>
              
                <div class="weather-description">${currentData.weather[0].description}</div>

                <div class="weather-stats">
                    <div class="stat-item">
                        <div class="stat-icon"><i class="fas fa-wind"></i></div>
                        <div>
                            <div class="stat-value">${currentData.wind.speed} m/s</div>
                            <div class="stat-label">Wind Speed</div>
                        </div>
                    </div>

                    <div class="stat-item">
                          <div class="stat-icon"><i class="fas fa-tint"></i></div>
                          <div>
                              <div class="stat-value">${currentData.main.humidity}%</div>
                              <div class="stat-label">Humidity</div>
                          </div>
                    </div>

                    <div class="stat-item">
                          <div class="stat-icon"><i class="fas fa-temperature-high"></i></div>
                          <div>
                              <div class="stat-value">${Math.round(currentData.main.feels_like)}°C</div>
                              <div class="stat-label">Feels Like</div>
                          </div>
                    </div>

                    <div class="stat-item">
                        <div class="stat-icon"><i class="fas fa-compress-alt"></i></div>
                        <div>
                            <div class="stat-value">${currentData.main.pressure} hPa</div>
                            <div class="stat-label">Pressure</div>
                        </div>
                    </div>
                </div>
            </div>
          
            <div class="forecast-container">
                <div class="hourly-forecast-container">
                    <h3 class="section-title"><i class="fas fa-clock"></i> Hourly Forecast</h3>
                    <div class="hourly-forecast">
                        ${hourlyForecast.map(hour => `
                          <div class="hourly-item">
                            <div class="hourly-time">${hour.time}</div>
                            <img src="https://openweathermap.org/img/wn/${hour.icon}.png" alt="${hour.description}" class="hourly-icon">
                            <div class="hourly-temp">${hour.temp}°</div>
                          </div>
                        `).join('')}
                    </div>
                </div>
                    
                <div class="daily-forecast">
                    <h3 class="section-title"><i class="fas fa-calendar-alt"></i> 5-Day Forecast</h3>
                    ${dailyForecast.map(day => `
                        <div class="daily-item">
                          <div class="day-name">${day.day}</div>
                          <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="Weather icon" class="daily-icon">
                          <div class="daily-temps">
                            <div class="daily-high">${day.high}°</div>
                            <div class="daily-low">${day.low}°</div>
                          </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        result.innerHTML = `
          <div class="error-container">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3 class="error-title">Connection Error</h3>
                <p class="error-message">We couldn't fetch weather data. Please check your connection and try again.</p>
                <button class="retry-btn" onclick="getWeather()">Retry</button>
          </div>
        `;
        console.error(error);
    }
}

document.getElementById('cityInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getWeather();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 150);
    });
});