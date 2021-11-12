import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "apollo-boost";
import gql from 'graphql-tag';
import { getAccessToken, isLoggedIn } from "./auth";

const graphqlEndpointURL = 'http://localhost:9000/graphql';

const authLink = new ApolloLink((operation, forward) => {
    if (isLoggedIn()) {
        operation.setContext({
            headers: {
                'authorization': `Bearer ${getAccessToken()}`
            }
        })
    }
    return forward(operation);
})

const client = new ApolloClient({
    link: ApolloLink.from([
        authLink,
        new HttpLink({ uri: graphqlEndpointURL }),
    ]),
    cache: new InMemoryCache(),
})

const companyQuery = gql`
    query QueryCompany($id: ID!) {
      company(id: $id) {
        id
        name
        description
        jobs {
          id
          title
        }
      }
    }
`;

const jobDetailsFragment = gql`
    fragment JobDetails on Job {
        id
        title
        company {
          id
          name
        }
        description
    }
`;

const createJobMutation = gql`
    mutation CreateJob($input: CreateJobInput) {
      job: createJob(input: $input) {
        ...JobDetails
      }
    }
    ${jobDetailsFragment}
`;

const jobQuery = gql`
    query QueryJob($id: ID!) {
      job(id: $id) {
        ...JobDetails
      }
    }
    ${jobDetailsFragment}
`;

const jobsQuery = gql`
    query QueryJobs {
      jobs {
        id
        title
        company {
          id
          name
        }
      }
    }
`;

export async function createJob(input) {
    const { data: { job } } = await client.mutate({
        mutation: createJobMutation,
        variables: { input },
        update: (cache, mutationResult) => {
            cache.writeQuery({
                query: jobQuery,
                variables: { id: mutationResult.data.job.id },
                data: mutationResult
            })
        }
    });
    return job;
}

export async function loadCompany(id) {
    const { data: { company } } = await client.query({ query: companyQuery, variables: { id } });
    return company
}


export async function loadJob(id) {
    const { data: { job } } = await client.query({ query: jobQuery, variables: { id } });
    return job;
}

export async function loadJobs() {
    const { data: { jobs } } = await client.query({ query: jobsQuery, fetchPolicy: 'no-cache' });
    return jobs;
}
