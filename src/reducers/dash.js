import { combineReducers } from 'redux'
import Immutable from 'immutable'
import { REQUEST_GET_MY_TRENDING_DISCUSSIONS,
         SUCCESS_GET_MY_TRENDING_DISCUSSIONS,
         FAILURE_GET_MY_TRENDING_DISCUSSIONS,
         REQUEST_DASH_USER_INFO,
         SUCCESS_DASH_USER_INFO,
         FAILURE_DASH_USER_INFO } from '../actions/dashAction'

const getMyTrendingDiscussionsState = Immutable.Map({
  isFetching: false,
  payload: null,
  error: false
})

function myTrendingDiscussions(state = getMyTrendingDiscussionsState, action) {
  switch (action.type) {
    case REQUEST_GET_MY_TRENDING_DISCUSSIONS:
      return state.merge({
        isFetching: true,
        payload: null,
        error: false
      })
    case SUCCESS_GET_MY_TRENDING_DISCUSSIONS:
      return state.merge({
        isFetching: false,
        payload: action.payload,
        error: false
      })
    case FAILURE_GET_MY_TRENDING_DISCUSSIONS:
      return state.merge({
        isFetching: false,
        payload: action.payload.response,
        error: true
      })
    default:
      return state
  }
}

const getDashUserInfoState = Immutable.Map({
  isFetching: false,
  payload: null,
  error: false
})

function dashUserInfo(state = getDashUserInfoState, action) {
  switch (action.type) {
    case REQUEST_DASH_USER_INFO:
      return state.merge({
        isFetching: true,
        payload: null,
        error: false
      })
    case SUCCESS_DASH_USER_INFO:
      return state.merge({
        isFetching: false,
        payload: action.payload,
        error: false
      })
    case FAILURE_DASH_USER_INFO:
      return state.merge({
        isFetching: false,
        payload: action.payload.response,
        error: true
      })
    default:
      return state
  }
}

export let dash = combineReducers({
  myTrendingDiscussions,
  dashUserInfo
})