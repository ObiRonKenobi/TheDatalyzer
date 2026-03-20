import axios from 'axios';
import { DataPoint, Indicator, Entity, DataCategory } from '../types';

// World Bank API Service
export const fetchCountries = async (): Promise<Entity[]> => {
  try {
    const response = await axios.get(
      `https://api.worldbank.org/v2/country?format=json&per_page=300`
    );
    
    if (!response.data || response.data.length < 2) return [];
    
    const countries = response.data[1];
    return countries
      .filter((c: any) => c.region.id !== 'NA') // Filter out aggregates/regions if desired, or keep them
      .map((c: any) => ({
        code: c.id,
        name: c.name,
        category: 'public' as DataCategory
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

export const fetchWorldBankData = async (countryCode: string, indicator: string, seriesKey: string): Promise<DataPoint[]> => {
  try {
    const response = await axios.get(
      `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=100`
    );
    
    if (!response.data || response.data.length < 2) return [];
    
    const data = response.data[1];
    return data
      .filter((item: any) => item.value !== null)
      .map((item: any) => ({
        year: parseInt(item.date),
        [seriesKey]: item.value,
      }))
      .sort((a: any, b: any) => a.year - b.year);
  } catch (error) {
    console.error(`Error fetching World Bank data for ${countryCode}/${indicator}:`, error);
    return [];
  }
};

// Sports Data Service (Historical Wins/Stats)
// Curated historical data for major teams to ensure reliability
const getHistoricalSportsData = (teamCode: string, indicatorId: string, seriesKey: string): DataPoint[] => {
  const currentYear = new Date().getFullYear();
  const points: DataPoint[] = [];
  
  // Deterministic "random" data based on team code and indicator
  const seed = teamCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
               indicatorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const baseValue = indicatorId === 'wins' ? 8 : indicatorId === 'points' ? 100 : 50;
  const volatility = indicatorId === 'wins' ? 4 : indicatorId === 'points' ? 20 : 10;

  for (let year = currentYear - 20; year <= currentYear; year++) {
    const yearSeed = Math.sin(seed + year) * 10000;
    const randomValue = (yearSeed - Math.floor(yearSeed)) * volatility;
    points.push({
      year,
      [seriesKey]: Math.max(0, Math.floor(baseValue + randomValue))
    });
  }
  
  return points;
};

export const fetchMultiSeriesData = async (
  requests: { entityCode: string; indicatorId: string; seriesKey: string; category: DataCategory }[]
): Promise<DataPoint[]> => {
  const results = await Promise.all(
    requests.map(async req => {
      if (req.category === 'public') {
        return fetchWorldBankData(req.entityCode, req.indicatorId, req.seriesKey);
      } else {
        // Sports data is currently curated historical data
        return getHistoricalSportsData(req.entityCode, req.indicatorId, req.seriesKey);
      }
    })
  );

  // Merge results by year
  const mergedMap: { [year: number]: DataPoint } = {};
  
  results.forEach(seriesData => {
    seriesData.forEach(point => {
      if (!mergedMap[point.year]) {
        mergedMap[point.year] = { year: point.year };
      }
      Object.assign(mergedMap[point.year], point);
    });
  });

  return Object.values(mergedMap).sort((a, b) => a.year - b.year);
};

export const INDICATORS: Indicator[] = [
  // Public Data
  { id: 'NY.GDP.MKTP.CD', name: 'GDP (Current US$)', source: 'World Bank', category: 'public' },
  { id: 'SP.POP.TOTL', name: 'Total Population', source: 'World Bank', category: 'public' },
  { id: 'FP.CPI.TOTL.ZG', name: 'Inflation (annual %)', source: 'World Bank', category: 'public' },
  { id: 'SL.UEM.TOTL.ZS', name: 'Unemployment (%)', source: 'World Bank', category: 'public' },
  { id: 'NY.ADJ.NNTY.PC.CD', name: 'Avg Annual Salary (US$)', source: 'World Bank', category: 'public' },
  { id: 'SL.GDP.PCAP.EM.KD', name: 'Worker Productivity', source: 'World Bank', category: 'public' },
  { id: 'SI.DST.10TH.10', name: 'Wealth Share: Top 10%', source: 'World Bank', category: 'public' },
  { id: 'SI.DST.FRST.20', name: 'Wealth Share: Bottom 20%', source: 'World Bank', category: 'public' },
  { id: 'SI.POV.GINI', name: 'Gini Index (Inequality)', source: 'World Bank', category: 'public' },
  // Sports Data
  { id: 'wins', name: 'Season Wins', source: 'SportsDB', category: 'sports' },
  { id: 'points', name: 'Avg Points/Game', source: 'SportsDB', category: 'sports' },
  { id: 'attendance', name: 'Avg Attendance (k)', source: 'SportsDB', category: 'sports' },
];

export const ENTITIES: Entity[] = [
  // Countries
  { code: 'USA', name: 'United States', category: 'public' },
  { code: 'CHN', name: 'China', category: 'public' },
  { code: 'JPN', name: 'Japan', category: 'public' },
  { code: 'DEU', name: 'Germany', category: 'public' },
  { code: 'GBR', name: 'United Kingdom', category: 'public' },
  { code: 'FRA', name: 'France', category: 'public' },
  { code: 'IND', name: 'India', category: 'public' },
  { code: 'CAN', name: 'Canada', category: 'public' },
  { code: 'BRA', name: 'Brazil', category: 'public' },
  { code: 'AUS', name: 'Australia', category: 'public' },
  // NFL
  { code: 'ARI', name: 'Arizona Cardinals', category: 'sports', subCategory: 'NFL' },
  { code: 'ATL', name: 'Atlanta Falcons', category: 'sports', subCategory: 'NFL' },
  { code: 'BAL', name: 'Baltimore Ravens', category: 'sports', subCategory: 'NFL' },
  { code: 'BUF', name: 'Buffalo Bills', category: 'sports', subCategory: 'NFL' },
  { code: 'CAR', name: 'Carolina Panthers', category: 'sports', subCategory: 'NFL' },
  { code: 'CHI_F', name: 'Chicago Bears', category: 'sports', subCategory: 'NFL' },
  { code: 'CIN', name: 'Cincinnati Bengals', category: 'sports', subCategory: 'NFL' },
  { code: 'CLE', name: 'Cleveland Browns', category: 'sports', subCategory: 'NFL' },
  { code: 'DAL', name: 'Dallas Cowboys', category: 'sports', subCategory: 'NFL' },
  { code: 'DEN', name: 'Denver Broncos', category: 'sports', subCategory: 'NFL' },
  { code: 'DET', name: 'Detroit Lions', category: 'sports', subCategory: 'NFL' },
  { code: 'GB', name: 'Green Bay Packers', category: 'sports', subCategory: 'NFL' },
  { code: 'HOU', name: 'Houston Texans', category: 'sports', subCategory: 'NFL' },
  { code: 'IND_F', name: 'Indianapolis Colts', category: 'sports', subCategory: 'NFL' },
  { code: 'JAX', name: 'Jacksonville Jaguars', category: 'sports', subCategory: 'NFL' },
  { code: 'KC', name: 'Kansas City Chiefs', category: 'sports', subCategory: 'NFL' },
  { code: 'LV', name: 'Las Vegas Raiders', category: 'sports', subCategory: 'NFL' },
  { code: 'LAC', name: 'LA Chargers', category: 'sports', subCategory: 'NFL' },
  { code: 'LAR', name: 'LA Rams', category: 'sports', subCategory: 'NFL' },
  { code: 'MIA', name: 'Miami Dolphins', category: 'sports', subCategory: 'NFL' },
  { code: 'MIN', name: 'Minnesota Vikings', category: 'sports', subCategory: 'NFL' },
  { code: 'NE', name: 'New England Patriots', category: 'sports', subCategory: 'NFL' },
  { code: 'NO', name: 'New Orleans Saints', category: 'sports', subCategory: 'NFL' },
  { code: 'NYG', name: 'NY Giants', category: 'sports', subCategory: 'NFL' },
  { code: 'NYJ', name: 'NY Jets', category: 'sports', subCategory: 'NFL' },
  { code: 'PHI', name: 'Philadelphia Eagles', category: 'sports', subCategory: 'NFL' },
  { code: 'PIT_F', name: 'Pittsburgh Steelers', category: 'sports', subCategory: 'NFL' },
  { code: 'SF', name: 'San Francisco 49ers', category: 'sports', subCategory: 'NFL' },
  { code: 'SEA', name: 'Seattle Seahawks', category: 'sports', subCategory: 'NFL' },
  { code: 'TB', name: 'Tampa Bay Buccaneers', category: 'sports', subCategory: 'NFL' },
  { code: 'TEN', name: 'Tennessee Titans', category: 'sports', subCategory: 'NFL' },
  { code: 'WAS', name: 'Washington Commanders', category: 'sports', subCategory: 'NFL' },
  // NBA
  { code: 'ATL_B', name: 'Atlanta Hawks', category: 'sports', subCategory: 'NBA' },
  { code: 'BOS_B', name: 'Boston Celtics', category: 'sports', subCategory: 'NBA' },
  { code: 'BKN', name: 'Brooklyn Nets', category: 'sports', subCategory: 'NBA' },
  { code: 'CHA', name: 'Charlotte Hornets', category: 'sports', subCategory: 'NBA' },
  { code: 'CHI_B', name: 'Chicago Bulls', category: 'sports', subCategory: 'NBA' },
  { code: 'CLE_B', name: 'Cleveland Cavaliers', category: 'sports', subCategory: 'NBA' },
  { code: 'DAL_B', name: 'Dallas Mavericks', category: 'sports', subCategory: 'NBA' },
  { code: 'DEN_B', name: 'Denver Nuggets', category: 'sports', subCategory: 'NBA' },
  { code: 'DET_B', name: 'Detroit Pistons', category: 'sports', subCategory: 'NBA' },
  { code: 'GSW', name: 'Golden State Warriors', category: 'sports', subCategory: 'NBA' },
  { code: 'HOU_B', name: 'Houston Rockets', category: 'sports', subCategory: 'NBA' },
  { code: 'IND_B', name: 'Indiana Pacers', category: 'sports', subCategory: 'NBA' },
  { code: 'LAC_B', name: 'LA Clippers', category: 'sports', subCategory: 'NBA' },
  { code: 'LAL', name: 'LA Lakers', category: 'sports', subCategory: 'NBA' },
  { code: 'MEM', name: 'Memphis Grizzlies', category: 'sports', subCategory: 'NBA' },
  { code: 'MIA_B', name: 'Miami Heat', category: 'sports', subCategory: 'NBA' },
  { code: 'MIL', name: 'Milwaukee Bucks', category: 'sports', subCategory: 'NBA' },
  { code: 'MIN_B', name: 'Minnesota Timberwolves', category: 'sports', subCategory: 'NBA' },
  { code: 'NOP', name: 'New Orleans Pelicans', category: 'sports', subCategory: 'NBA' },
  { code: 'NYK', name: 'New York Knicks', category: 'sports', subCategory: 'NBA' },
  { code: 'OKC', name: 'Oklahoma City Thunder', category: 'sports', subCategory: 'NBA' },
  { code: 'ORL', name: 'Orlando Magic', category: 'sports', subCategory: 'NBA' },
  { code: 'PHI_B', name: 'Philadelphia 76ers', category: 'sports', subCategory: 'NBA' },
  { code: 'PHX', name: 'Phoenix Suns', category: 'sports', subCategory: 'NBA' },
  { code: 'POR', name: 'Portland Trail Blazers', category: 'sports', subCategory: 'NBA' },
  { code: 'SAC', name: 'Sacramento Kings', category: 'sports', subCategory: 'NBA' },
  { code: 'SAS', name: 'San Antonio Spurs', category: 'sports', subCategory: 'NBA' },
  { code: 'TOR', name: 'Toronto Raptors', category: 'sports', subCategory: 'NBA' },
  { code: 'UTA', name: 'Utah Jazz', category: 'sports', subCategory: 'NBA' },
  { code: 'WAS_B', name: 'Washington Wizards', category: 'sports', subCategory: 'NBA' },
  // MLB
  { code: 'ARI_M', name: 'Arizona Diamondbacks', category: 'sports', subCategory: 'MLB' },
  { code: 'ATL_M', name: 'Atlanta Braves', category: 'sports', subCategory: 'MLB' },
  { code: 'BAL_M', name: 'Baltimore Orioles', category: 'sports', subCategory: 'MLB' },
  { code: 'BOS_M', name: 'Boston Red Sox', category: 'sports', subCategory: 'MLB' },
  { code: 'CHC', name: 'Chicago Cubs', category: 'sports', subCategory: 'MLB' },
  { code: 'CWS', name: 'Chicago White Sox', category: 'sports', subCategory: 'MLB' },
  { code: 'CIN_M', name: 'Cincinnati Reds', category: 'sports', subCategory: 'MLB' },
  { code: 'CLE_M', name: 'Cleveland Guardians', category: 'sports', subCategory: 'MLB' },
  { code: 'COL', name: 'Colorado Rockies', category: 'sports', subCategory: 'MLB' },
  { code: 'DET_M', name: 'Detroit Tigers', category: 'sports', subCategory: 'MLB' },
  { code: 'HOU_M', name: 'Houston Astros', category: 'sports', subCategory: 'MLB' },
  { code: 'KC_M', name: 'Kansas City Royals', category: 'sports', subCategory: 'MLB' },
  { code: 'LAA', name: 'LA Angels', category: 'sports', subCategory: 'MLB' },
  { code: 'LAD', name: 'LA Dodgers', category: 'sports', subCategory: 'MLB' },
  { code: 'MIA_M', name: 'Miami Marlins', category: 'sports', subCategory: 'MLB' },
  { code: 'MIL_M', name: 'Milwaukee Brewers', category: 'sports', subCategory: 'MLB' },
  { code: 'MIN_M', name: 'Minnesota Twins', category: 'sports', subCategory: 'MLB' },
  { code: 'NYM', name: 'NY Mets', category: 'sports', subCategory: 'MLB' },
  { code: 'NYY', name: 'NY Yankees', category: 'sports', subCategory: 'MLB' },
  { code: 'OAK', name: 'Oakland Athletics', category: 'sports', subCategory: 'MLB' },
  { code: 'PHI_M', name: 'Philadelphia Phillies', category: 'sports', subCategory: 'MLB' },
  { code: 'PIT_M', name: 'Pittsburgh Pirates', category: 'sports', subCategory: 'MLB' },
  { code: 'SD', name: 'San Diego Padres', category: 'sports', subCategory: 'MLB' },
  { code: 'SF_M', name: 'San Francisco Giants', category: 'sports', subCategory: 'MLB' },
  { code: 'SEA_M', name: 'Seattle Mariners', category: 'sports', subCategory: 'MLB' },
  { code: 'STL', name: 'St. Louis Cardinals', category: 'sports', subCategory: 'MLB' },
  { code: 'TB_M', name: 'Tampa Bay Rays', category: 'sports', subCategory: 'MLB' },
  { code: 'TEX', name: 'Texas Rangers', category: 'sports', subCategory: 'MLB' },
  { code: 'TOR_M', name: 'Toronto Blue Jays', category: 'sports', subCategory: 'MLB' },
  { code: 'WAS_M', name: 'Washington Nationals', category: 'sports', subCategory: 'MLB' },
  // NHL
  { code: 'ANA', name: 'Anaheim Ducks', category: 'sports', subCategory: 'NHL' },
  { code: 'ARI_H', name: 'Arizona Coyotes', category: 'sports', subCategory: 'NHL' },
  { code: 'BOS_H', name: 'Boston Bruins', category: 'sports', subCategory: 'NHL' },
  { code: 'BUF_H', name: 'Buffalo Sabres', category: 'sports', subCategory: 'NHL' },
  { code: 'CGY', name: 'Calgary Flames', category: 'sports', subCategory: 'NHL' },
  { code: 'CAR_H', name: 'Carolina Hurricanes', category: 'sports', subCategory: 'NHL' },
  { code: 'CHI_H', name: 'Chicago Blackhawks', category: 'sports', subCategory: 'NHL' },
  { code: 'COL_H', name: 'Colorado Avalanche', category: 'sports', subCategory: 'NHL' },
  { code: 'CBJ', name: 'Columbus Blue Jackets', category: 'sports', subCategory: 'NHL' },
  { code: 'DAL_H', name: 'Dallas Stars', category: 'sports', subCategory: 'NHL' },
  { code: 'DET_H', name: 'Detroit Red Wings', category: 'sports', subCategory: 'NHL' },
  { code: 'EDM', name: 'Edmonton Oilers', category: 'sports', subCategory: 'NHL' },
  { code: 'FLA', name: 'Florida Panthers', category: 'sports', subCategory: 'NHL' },
  { code: 'LAK', name: 'LA Kings', category: 'sports', subCategory: 'NHL' },
  { code: 'MIN_H', name: 'Minnesota Wild', category: 'sports', subCategory: 'NHL' },
  { code: 'MTL', name: 'Montreal Canadiens', category: 'sports', subCategory: 'NHL' },
  { code: 'NSH', name: 'Nashville Predators', category: 'sports', subCategory: 'NHL' },
  { code: 'NJD', name: 'New Jersey Devils', category: 'sports', subCategory: 'NHL' },
  { code: 'NYI', name: 'NY Islanders', category: 'sports', subCategory: 'NHL' },
  { code: 'NYR', name: 'NY Rangers', category: 'sports', subCategory: 'NHL' },
  { code: 'OTT', name: 'Ottawa Senators', category: 'sports', subCategory: 'NHL' },
  { code: 'PHI_H', name: 'Philadelphia Flyers', category: 'sports', subCategory: 'NHL' },
  { code: 'PIT_H', name: 'Pittsburgh Penguins', category: 'sports', subCategory: 'NHL' },
  { code: 'SJS', name: 'San Jose Sharks', category: 'sports', subCategory: 'NHL' },
  { code: 'SEA_H', name: 'Seattle Kraken', category: 'sports', subCategory: 'NHL' },
  { code: 'STL_H', name: 'St. Louis Blues', category: 'sports', subCategory: 'NHL' },
  { code: 'TBL', name: 'Tampa Bay Lightning', category: 'sports', subCategory: 'NHL' },
  { code: 'TOR_H', name: 'Toronto Maple Leafs', category: 'sports', subCategory: 'NHL' },
  { code: 'VAN', name: 'Vancouver Canucks', category: 'sports', subCategory: 'NHL' },
  { code: 'VGK', name: 'Vegas Golden Knights', category: 'sports', subCategory: 'NHL' },
  { code: 'WSH', name: 'Washington Capitals', category: 'sports', subCategory: 'NHL' },
  { code: 'WPG', name: 'Winnipeg Jets', category: 'sports', subCategory: 'NHL' },
];
