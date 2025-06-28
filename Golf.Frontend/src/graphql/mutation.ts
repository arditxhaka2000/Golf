// Golf.Frontend/src/graphql/mutations.ts
// GraphQL mutations for all golf operations
// Corresponds to backend mutations and follows GraphQL best practices

import { gql } from '@apollo/client';

// REQ 1-3: Course search and import mutations
export const SEARCH_COURSES_MUTATION = gql`
  mutation SearchCourses($name: String!) {
    searchCourses(name: $name) {
      id
      name
      location
      courseRating
      slopeRating
      holes {
        holeNumber
        par
        handicap
      }
    }
  }
`;

export const IMPORT_COURSE_MUTATION = gql`
  mutation ImportCourse($externalId: String!) {
    importCourse(externalId: $externalId) {
      id
      name
      courseRating
      slopeRating
      externalApiId
      holes {
        holeNumber
        par
        handicap
      }
    }
  }
`;

// REQ 1-8: Round saving mutation
export const SAVE_ROUND_MUTATION = gql`
  mutation SaveRound($input: SaveRoundInput!, $token: String!) {
    saveRound(input: $input, token: $token) {
      id
      datePlayed
      totalStrokes
      grossScore
      netScore
      handicapDifferential
      course {
        name
      }
    }
  }
`;

// Authentication mutations (existing)
export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(input: { username: $username, password: $password }) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $password: String!, $email: String!) {
    register(input: { username: $username, password: $password, email: $email }) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

// REQ 1-2: Create player mutation with gender
export const CREATE_PLAYER_MUTATION = gql`
  mutation CreatePlayer($input: CreatePlayerInput!, $token: String!) {
    createPlayer(input: $input, token: $token) {
      id
      name
      gender
      currentHandicap
    }
  }
`;