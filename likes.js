let twitterFetchLikes = (client, endpoint, params, results) => {
	return new Promise( async (resolve, reject) => {
		try {
			let response = await client.get(endpoint, params);
			resolve(response);
	      } catch(error) {
		    console.log('error in twitterFetchLikes', error)
		    reject(error);
		  }
		
	})
}

let getLikes = (client, userId) => {
	return new Promise((resolve, reject) => {
		let likesEndpoint = 'favorites/list'; 
		let likesParams = {
			'user_id': userId,
			'count': 200,
			'include_entities': true,
			'tweet_mode': 'extended'
		};
		twitterFetchLikes(client, likesEndpoint, likesParams, [])
		.then(likes => resolve(likes))
		.catch(err => {
			console.log('error in getLikes', err);
			reject(err)
		})
	})
}

module.exports = getLikes;