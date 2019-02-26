import React, { Component } from 'react'
import * as firebase from 'firebase/app'
import 'firebase/database'
import flatten from 'lodash/flatten'
import ResultsHero from '../components/ResultsHero/ResultsHero'
import ResultsLoading from '../components/ResultsLoading/ResultsLoading'
import Footer from '../components/Footer/Footer'
import GeneralResultsModal from '../components/GeneralResultsModal/GeneralResultsModal'

const Storage = typeof window !== 'undefined' && window.localStorage

const config = {
  apiKey: process.env.GATSBY_GOOGLE_API_KEY,
  authDomain: process.env.GATSBY_AUTH_DOMAIN,
  databaseURL: process.env.GATSBY_DATABASE_URL,
  projectId: 'web-behavior',
  storageBucket: '',
  messagingSenderId: process.env.GATSBY_GOOGLE_MESSAGING_SENDER_ID,
}

class Results extends Component {
  constructor() {
    super()

    this.state = {
      userData: null,
      generaldata: null,
      userId:
        (typeof window !== 'undefined' &&
          window.location.hash.replace('#', '')) ||
        (Storage && Storage.getItem('userId')),
      isLoading: true,
    }
    this.app = null
  }

  componentDidMount() {
    if (firebase.apps.length > 0) {
      firebase
        .app()
        .delete()
        .then(() => this.initFirebase())
    } else {
      this.initFirebase()
    }
    // this.registerEveryOnesData();
  }

  registerEveryOnesData() {
    console.log('Getting general data')
    firebase
      .database()
      .ref('/history-data/')
      .once('value')
      .then(snapshot => {
        const data = snapshot.val()
        console.log('Got data')
        const flattenedHistories = flatten(
          Object.keys(data).map(dataItem => {
            const localData = data[dataItem]['history-gist']

            return Object.keys(localData)
              .map(localDataItem => localData[localDataItem])
              .pop()
          })
        )

        let processedHistories = flattenedHistories.reduce(
          (accumulatedResults, currentRegistry) => {
            const accumulatedHistoryOccurances =
              accumulatedResults.totalHistoryAmount +
              currentRegistry.totalHistoryAmount
            return {
              totalHistoryAmount: accumulatedHistoryOccurances,
              totalPerCategory: currentRegistry.totalPerCategory.map(
                (category, index) => {
                  const accumulatedOccurances =
                    category.categoryOccurances +
                    accumulatedResults.totalPerCategory[index]
                      .categoryOccurances

                  return {
                    categoryOccurances: accumulatedOccurances,
                    categoryPercentage:
                      (accumulatedOccurances * 100) /
                      accumulatedHistoryOccurances,
                    categoryTitle: category.categoryTitle,
                  }
                }
              ),
            }
          }
        )

        processedHistories = {
          ...processedHistories,
          totalNumberOfHistories: flattenedHistories.length,
        }

        console.log('Writing general data')
        firebase
          .database()
          .ref('/general-gist/')
          .set(processedHistories)
      })
  }

  initFirebase = () => {
    firebase.initializeApp(config)

    console.log('Getting personal data')
    firebase
      .database()
      .ref('/history-data/' + this.state.userId + '/history-gist/')
      .once('value')
      .then(snapshot => {
        const data = snapshot.val()

        if (data) {
          const dataList = Object.keys(data).map(key => data[key])

          if (dataList.length > 0) {
            const latestData = dataList.pop()
            console.log('saving personal data')
            this.setState({
              userData: latestData,
              isLoading: false,
            })
          } else {
            this.setState({
              isLoading: false,
            })
          }
        }
      })

    console.log('Getting general data')
    firebase
      .database()
      .ref('/general-gist/')
      .once('value')
      .then(snapshot => {
        const data = snapshot.val()

        if (data) {
          const dataList = Object.keys(data).map(key => data[key])

          if (dataList.length > 0) {
            const latestData = dataList.pop()
            console.log('Saving general data')
            setTimeout(() => {
              this.setState({
                generalData: latestData,
                isLoading: false,
              })
            }, 10)
          } else {
            this.setState({
              isLoading: false,
            })
          }
        }
      })
  }

  render() {
    const { userData, generalData, isLoading } = this.state

    if (!userData && isLoading) {
      return <ResultsLoading />
    }
    if (!userData && !isLoading) {
      return <div> eita </div>
    }
    if (userData && !isLoading) {
      return (
        <div>
          <ResultsHero historyGist={userData} />
          <GeneralResultsModal generalData={generalData} userData={userData} />
          <Footer />
        </div>
      )
    }
  }
}

export default Results
