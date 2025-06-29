// Golf.Frontend/src/graphql/queries.ts
// GraphQL queries for fetching golf data
// REQ 1-8: Queries for handicap calculation and round history

import { gql } from '@apollo/client';

// REQ 1-8: Get user's rounds for handicap calculation
export const GET_MY_ROUNDS_QUERY = gql`
  query GetMyRounds($token: String!, $limit: Int!) {
    myRounds(token: $token, limit: $limit) {
      id
      datePlayed
      course {
        id
        name
      }
      totalStrokes
      grossScore
      netScore
      handicapDifferential
      playerHandicapAtTime
    }
  }
`;

// REQ 1-8: Get user's current handicap (read-only field)
export const GET_MY_HANDICAP_QUERY = gql`
  query GetMyHandicap($token: String!) {
    calculateMyHandicap(token: $token)
  }
`;

// Get available courses
export const GET_COURSES_QUERY = gql`
  query GetCourses {
    courses {
      id
      name
      courseRating
      slopeRating
      location
      holes {
        holeNumber
        par
        handicap
      }
    }
  }
`;

// Get specific course details
export const GET_COURSE_QUERY = gql`
  query GetCourse($id: ID!) {
    course(id: $id) {
      id
      name
      courseRating
      slopeRating
      location
      totalPar
      difficultyLevel
      holes {
        holeNumber
        par
        handicap
        difficulty
        nine
      }
    }
  }
`;

// Get player profile
export const GET_MY_PLAYER_QUERY = gql`
  query GetMyPlayer($token: String!) {
    getMyPlayer(token: $token) {
      id
      name
      gender
      currentHandicap
      totalRounds
      averageScore
      bestScore
      recentRounds {
        id
        datePlayed
        totalStrokes
        course {
          name
        }
      }
    }
  }
`;