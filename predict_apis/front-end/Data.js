document.addEventListener("alpine:init", () => {
  Alpine.data('app', () => ({
      selectedDigester: '',
      wasteVolume: null,
      showMessage: false,
      predictionResult: null,
      showTable: false, // Property for showing the comparison table
      history: [],
      chart: null,
      forecast: [], // To store the forecast data including icons
      isSignUp: false,
      isLoggedIn: !!localStorage.getItem('loggedInUser'),
      signUpUsername: '',
      signUpPassword: '',
      signInUsername: '',
      signInPassword: '',
      signUpError: '',
      signInError: '',

      init() {
          // Load the prediction history from localStorage
          this.history = JSON.parse(localStorage.getItem('biogasHistory')) || [];

           // Fetch weather data for the next 3 days based on location
           this.getWeatherForecast('Johannesburg').then(forecast => {
            this.forecast = forecast;
        });
          
          // Use $nextTick to ensure the DOM is updated before attempting to access the canvas
          this.$nextTick(() => {
              const ctx = document.getElementById('historyChart').getContext('2d');
              if (ctx) {
                  this.renderChart(ctx);
              } else {
                  console.error("Canvas context not found");
              }
          });
      },


       // Method to get weather forecast for the next 3 days
       getWeatherForecast(location) {
        const apiKey = '396a46c0790346f5a8d220215242310'; // Replace with your WeatherAPI key
        const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=3&aqi=no&alerts=no`;

        return axios.get(url)
            .then(response => {
                const forecast = response.data.forecast.forecastday.map(day => ({
                    date: day.date,
                    temp: day.day.avgtemp_c, // Average temperature for the day in Celsius
                    condition: day.day.condition.text, // Weather condition (e.g., Sunny, Rainy)
                    icon: day.day.condition.icon // URL for the weather condition icon
                }));
                return forecast;
            })
            .catch(error => {
                console.error("Error fetching weather data:", error);
                return [];
            });
    },

    // Check if temperature is optimal for biogas production
    isOptimalForBiogas(temp) {
        return temp >= 25 && temp <= 35;
    },

      renderChart() {
          setTimeout(() => {
            const canvas = document.getElementById('historyChart');
            const ctx = canvas?.getContext('2d');
        
            if (!ctx) {
              console.error("Canvas context not found");
              return;
            }
        
            canvas.style.display = '';
        
            const labels = this.history.map(entry => entry.date);
            const data = this.history.map(entry => parseFloat(entry.output));
        
            console.log('Creating chart with labels:', labels);
            console.log('Data:', data);
        
            if (data.length === 0 || data.every(isNaN)) {
              console.error("No valid data for chart");
              return;
            }
        
            // if (this.chart) {
            //   this.chart.destroy(); // Destroy previous chart instance
            // }
        
            try {
              this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: labels,
                  datasets: [{
                    label: 'Predicted Biogas Output (m³)',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2
                  }]
                },
                options: {
                  responsive: true,
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Date'
                      },
                      barPercentage: 0.5,  // Adjust the width of the bars (0 to 1 scale)
                      categoryPercentage: 0.5 // Adjust space between bars (0 to 1 scale)
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Predicted Output (m³)'
                      }
                    }
                  }
                }
              });
        
              console.log('Chart created successfully', this.chart);
            } catch (error) {
              console.error("Error creating chart:", error);
            }
          }, 100);
      },
      
       // Toggle between sign-up and sign-in
       toggleAuth() {
        this.isSignUp = !this.isSignUp;
        this.signUpError = '';
        this.signInError = '';
    },

    // Sign Up logic
    signUp() {
        if (localStorage.getItem(this.signUpUsername)) {
            this.signUpError = "Username already exists.";
        } else {
            localStorage.setItem(this.signUpUsername, JSON.stringify({
                password: this.signUpPassword,
                history: []
            }));
            this.signUpError = '';
            alert("Sign-up successful! Please sign in.");
            this.toggleAuth(); // Switch to Sign In after successful sign-up
        }
    },

    // Sign In logic
    signIn() {
        const userData = JSON.parse(localStorage.getItem(this.signInUsername));
        if (userData && userData.password === this.signInPassword) {
            localStorage.setItem('loggedInUser', this.signInUsername);
            this.isLoggedIn = true;
            window.location.href = 'index.html'; // Redirect to index page
        } else {
            this.signInError = "Invalid username or password";
        }
    },

      // Select a digester and reset the table view
      selectDigester(digester) {
          this.selectedDigester = digester;
          this.showMessage = false; // Reset message when digester is selected
          this.showTable = false;   // Reset the table view when a new digester is selected
      },

      // Function to handle form submission
      submitForm() {
          if (this.selectedDigester && this.wasteVolume) {
              // Call the API to get the biogas prediction
              axios.post('/api/ml/predict', {
                  digester_type: this.selectedDigester,
                  total_waste: this.wasteVolume
              }, {
                  headers: {
                      'Content-Type': 'application/json',
                  }
              })
              .then(response => {
                  this.showMessage = true;
                  this.predictionResult = response.data[0][0]; // Assuming the prediction is returned in the first index

                  // Save the prediction to history
                  const predictionEntry = {
                      digester: this.selectedDigester,
                      wasteVolume: this.wasteVolume,
                      output: this.predictionResult,
                      date: new Date().toLocaleString()
                  };
                  this.history.push(predictionEntry);

                  // Save history to localStorage
                  localStorage.setItem('biogasHistory', JSON.stringify(this.history));

                  // Clear the form fields
                  this.selectedDigester = '';
                  this.wasteVolume = null;
              })
              .catch(error => {
                  console.error("Error making the API request:", error);
                  alert("Failed to get the prediction. Please try again.");
              });
          } else {
              alert("Please fill in all fields.");
          }
      }
  }));
});