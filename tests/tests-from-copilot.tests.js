const { getAverage, findMedian, excelDateToDayjs, getWeatherDataBetween2Dates, performObservationScraping } = require('../src/meteo-scraping-file-input.js');
const dayjs = require('dayjs');

// Mocking the performObservationScraping function directly in the tests
jest.mock('../src/meteo-scraping-file-input.js', () => {
  const actualModule = jest.requireActual('../src/meteo-scraping-file-input.js');
  return {
    ...actualModule,
    performObservationScraping: jest.fn()
  };
});

describe('Weather Data Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('getAverage should return the average of given numbers', () => {
    expect(getAverage(1, 2, 3, 4, 5)).toBe("3.00");
    expect(getAverage(-1, -2, -3, -4, -5)).toBe("-3.00");
    expect(getAverage()).toBe("0");
    expect(getAverage(10.5, 15.75)).toBe("13.13");
  });

  test('findMedian should return the median of given numbers', () => {
    expect(findMedian(1, 2, 3, 4, 5)).toBe("3.00");
    expect(findMedian(1, 3, 3, 6, 7, 8, 9)).toBe("6.00");
    expect(findMedian(1, 2, 3, 4)).toBe("2.50");
    expect(findMedian()).toBe("0");
    expect(findMedian(10.5, 15.75, 11.25)).toBe("11.25");
  });

  test('excelDateToDayjs should correctly convert an Excel date to a Dayjs date', () => {
    const excelDate = 43831; // 01/01/2020 in Excel date format
    const dayjsDate = excelDateToDayjs(excelDate, 'Europe/Paris');
    expect(dayjsDate.format('DD/MM/YYYY')).toBe('01/01/2020');
  });

  test('getWeatherDataBetween2Dates should return correct weather data', async () => {
    const mockWeatherData = {
      weatherStationId: '12345',
      startDate: new Date('2020-01-01T00:00:00.000Z'),
      endDate: new Date('2020-01-02T00:00:00.000Z'),
      minTemperature: -5.00,
      maxTemperature: 10.00,
      averageTemperature: 2.50,
      medianTemperature: 2.50
    };

    performObservationScraping.mockResolvedValueOnce([
      { temperature: '-5', dayjs: dayjs('2020-01-01T00:00:00.000Z') },
      { temperature: '10', dayjs: dayjs('2020-01-01T12:00:00.000Z') }
    ]);

    // Mocking the excel file read to avoid external dependency
    jest.mock('xlsx', () => ({
      readFile: jest.fn().mockReturnValue({ /* mock your file content here */ })
    }));

    const weatherData = await getWeatherDataBetween2Dates('12345', 43831, 43832);

    console.log("Filtered Data Count:", weatherData.filteredDatas);  // Add a log to check filtered data count
    console.log("Temperatures Array:", weatherData.temperatures);    // Add a log to check temperatures array

    expect(weatherData.minTemperature).toBe(mockWeatherData.minTemperature);
    expect(weatherData.maxTemperature).toBe(mockWeatherData.maxTemperature);
    expect(weatherData.averageTemperature).toBe(mockWeatherData.averageTemperature);
    expect(weatherData.medianTemperature).toBe(mockWeatherData.medianTemperature);
    expect(weatherData).toEqual(mockWeatherData);
  });
});
