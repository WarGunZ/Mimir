import { useSession } from "next-auth/react";
import React, { useState } from "react";
import Avatar from "./Avatar";
import { PhotoIcon, LinkIcon } from "@heroicons/react/24/solid";
import { useForm } from "react-hook-form";
import { useMutation } from "@apollo/client";
import { initializeApollo,  } from "../apollo";
import { ADD_POST, ADD_SUBREDDIT } from "../graphql/mutations";
import { GET_ALL_POSTS, GET_SUBREDDIT_LIST_BY_TOPIC } from "../graphql/queries";
import toast from "react-hot-toast";

/**
 * FormData is an object with a string property called postTitle, a string property called postBody, a
 * string property called postImage, and a string property called subreddit.
 * @property {string} postTitle - The title of the post
 * @property {string} postBody - The body of the post.
 * @property {string} postImage - The image that will be posted to the subreddit alongisde the post.
 * @property {string} subreddit - The subreddit you want to post to.
 */
type FormData = {
	postTitle: string;
	postBody: string;
	postImage: string;
	subreddit: string;
};

/**
 * Props is an object that has a property called subreddit that is a string.
 * @property {string} subreddit - The name of the subreddit that we want to fetch the posts from.
 */
type Props = {
	subreddit?: string;
}

/**
 * This function handles the creation of a post. It uses the useSession hook to get the logged in user
 * state, the useForm hook to handle form data, and the useMutation hook to handle the mutation. It
 * also uses the react-hot-toast library to display a notification when the post is created. It
 * returns a form with a title, body, image, and subreddit input.It also contains the button  and logic that
 * submits the form data to the GraphQL API.
 *
 * @param {Props} props - The props object. subreddit (optional) is a string that represents the name/topic of the subreddit that we want to fetch the posts from.
 * @returns A form that allows the user to create a post.
 * @see {@link https://react-hook-form.com/api/useform}
 * @see {@link https://www.apollographql.com/docs/react/data/mutations/}
 * @see {@link https://next-auth.js.org/getting-started/client}
 * @see {@link https://react-hot-toast.com/}
 */
function PostBox( {subreddit}: Props ) {
	{/* useSession so we can use logged in user state*/}
	const { data: session } = useSession();

	{/* Using the useMutation hook from Apollo Client. It is taking the ADD_POST mutation and storing it in the addPost variable.
		refetchQueries is an array of queries that will be refetched after the mutation is completed.
		We are refetching the GET_ALL_POSTS query so that the new post will be displayed on the page.
	*/}
	const [addPost] = useMutation(ADD_POST, {
		refetchQueries: [
			GET_ALL_POSTS,
			"getPOSTList"
		],
	});

	{/* taking the ADD_SUBREDDIT mutation and storing it in the addSubreddit variable. */}
	const [addSubreddit] = useMutation(ADD_SUBREDDIT);

	{/* useState for Image */}
	const [imageBoxOpen, setimageBoxOpen] = useState(false);

	{/* useForm so we can use form state, Destructuring the useForm hook. */}
	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm();

	{/* onSubmit function */}
	const onSubmit = handleSubmit(async (formData) => {
		console.log(formData);

		{/* A toast notification. It is a notification that pops up on the screen. react-hot-toast*/}
		const notification = toast.loading("Posting...", {className:"dark:bg-[#3A9188] dark:text-[#F1F2EB]"});

		{/* Checking if the subreddit exists. If it does not exist, it will alert the user. */}
		try {
			/* Destructuring the data from the query. */
			const apolloClient = initializeApollo();
			const {
				data: { getSUBREDDITListByTopic },
			} = await apolloClient.query({
				// Query for the subreddit topic; check if the subreddit with the topic exists; passed in already.
				query: GET_SUBREDDIT_LIST_BY_TOPIC,
				variables: {
					topic: subreddit || formData.subreddit,
				},
			});

			const subredditExists = getSUBREDDITListByTopic.length > 0; // Check if the subreddit exists

			/* Checking if the subreddit exists. If it does not exist, it will create a new subreddit with that topic */
			if (!subredditExists) {
				console.log(
					"Subreddit does not exist, Creating a new subreddit"
				);

				/* Adding a new subreddit to the database. */
				const {
					data: { insertSUBREDDIT: newSubreddit },
				} = await addSubreddit({
					variables: {
						topic: formData.subreddit,
					},
				});



				console.log(
					"Subreddit created. Creating a new post...",
					formData
				);

				const image = formData.postImage || " "; // If there is no image, set it to an empty string, protecting the database from null values.

				{/* Adding a new post to the database. it will have the subreddit id of the newSubreddit.
					Destructuring the data from the addPost mutation.
				*/}

				{/* Adding a new post to the database. */}
				const {
					data: { insertPOST: newPost },
				} = await addPost({
					variables: {
						title: formData.postTitle,
						body: formData.postBody,
						image: image,
						subreddit_id: newSubreddit.id,
						username: session?.user?.name,
					},
				});

				console.log("New Post created: ", newPost);
			} else {
				// If the subreddit exists, it will add the post to the database under that subreddit.

				console.log(
					"Subreddit exists. Using existing subreddit to create a new post...",
					formData
				);
				console.log(getSUBREDDITListByTopic);

				const image = formData.postImage || " "; // If there is no image, set it to an empty string, protecting the database from null values.

				{/* Destructuring the data from the addPost mutation.
					Adding a new post to the database.
				*/}
				const {
					data: { insertPOST: newPost },
				} = await addPost({
					variables: {
						title: formData.postTitle,
						body: formData.postBody,
						image: image,
						subreddit_id: getSUBREDDITListByTopic[0].id,
						username: session?.user?.name,
					},
				});

				console.log("New Post created: ", newPost);
			}

			{/* After the post has been added to the db */}
			setValue("postTitle", ""); // Clear the post title
			setValue("postBody", ""); // Clear the post body
			setValue("postImage", ""); // Clear the post image
			setValue("subreddit", ""); // Clear the subreddit

			/* A toast notification when post is created successfully. react-hot-toast */
			toast.success("New Post Created!", {
				id: notification,
			});

			toast.custom(
				(t) => (
					<div
						className={`${
							t.visible ? "animate-enter" : "animate-leave"
						}
						max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 mx-5 dark:bg-[#044A42]  dark:hover:ring-[#3A9188]`}
					>
						<div className='flex-1 w-0 p-4'>
							<div className='flex items-start'>
								<div className='flex-shrink-0 pt-0.5'>
									<Avatar></Avatar>
								</div>
								<div className='ml-3 flex-1'>
									<p className='font-gilroy text-sm font-medium text-gray-900 dark:text-[#B8E1DD]'>
										{session?.user?.name}
									</p>
									<p className='font-gilroy mt-1 text-sm text-gray-500 dark:text-[#B8E1DD]'>
										{formData.postTitle}
									</p>
								</div>
							</div>
						</div>
						<div className='flex border-l border-gray-200 dark:border-[#3A9188] rounded-r-lg dark:bg-[#3A9188] dark:hover:border-[#3A9188] '>
							<button
								onClick={() => toast.dismiss(t.id)}
								className='font-gilroy tracking-wide w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-[#F1F2EB] dark:focus:ring-[#3A9188]'
							>
								Close
							</button>
						</div>
					</div>
				),
				{
					position: "bottom-right",
				}
			);

			{
				/* Catching any errors */
			}
		} catch (error) {
			toast.error("Error creating post", {
				id: notification,
			});
			console.log(error);
		}
	});

	return (
		<form
			/* Calling the onSubmit function. */
			onSubmit={onSubmit}
			className='PostBoxForm sticky top-20 z-50 bg-white border rounded-md border-gray-300 p-2 dark:bg-[#062925]/95 font-gilroy backdrop-blur-sm dark:hover:border-[#3A9188]  dark:border-[#062925]/95'
		>
			<div className='flex items-center space-x-3 font-gilroy py-4'>
				{/* User Avatar */}
				<Avatar />

				{/* Checking if the user is signed in. If they are, it will display "Create a Post" in the input box.
                If they are not signed in, it will display "Sign In to create a post" in the input box.
                And the input box will be disabled.
            */}
				<input
					/* A spread operator. It is taking the register function and spreading it out. */
					{...register("postTitle", { required: true })}
					disabled={!session}
					className='font-gilroy tracking-wide subpixel-antialiased flex-1 bg-gray-50 p-2 pl-5 outline-none rounded-md border dark:text-[#B8E1DD] dark:bg-[#044A42] dark:border-[#3A9188] backdrop-blur-sm'
					type='text'
					placeholder={
						session ? subreddit ? `Create a post in m/${subreddit}` : "Create a Post" : "Sign In to create a post"
					}
				/>

				<PhotoIcon
					onClick={() => setimageBoxOpen(!imageBoxOpen)}
					className={`PhotoIconButton dark:text-[#3A9188] dark:lg:hover:text-[#B8E1DD] h-6 text-gray-300 cursor-pointer ${
						imageBoxOpen && "text-blue-500"
					}`}
				/>

				<LinkIcon className='dark:text-[#3A9188] h-6 text-gray-300 dark:lg:hover:text-[#B8E1DD]' />
			</div>

			{/* Checking if the user has typed anything in the input box. If they have, it will display this section.
				If they have not, it will not display. */}
			{!!watch("postTitle") && (
				<div className='flex flex-col py-2'>
					{/* Post Body */}
					<div className='flex flex-wrap items-stretch w-full relative px-2 pb-2'>
						<div className="flex -mr-px dark:bg-[#044A42] dark:text-[#B8E1DD]">
							<span className="flex items-center leading-normal rounded rounded-r-none border border-r-0 dark:border-[#3A9188] px-[40px] whitespace-no-wrap">
								Body
							</span>

						</div>
						<input
							className='bodyInput flex-1 mr-2 relative bg-gray-50 p-2 outline-none border font-gilroy tracking-wide subpixel-antialiased rounded rounded-l-none dark:text-[#B8E1DD] dark:bg-[#044A42] dark:border-[#3A9188] backdrop-blur-sm'
							{...register("postBody")}
							type='text'
							placeholder='Text (optional)'
						/>
					</div>

					{/* Sub-Reddit - Only render if subreddit hasn't been passed in. */}

					{!subreddit && (
						<div className='flex flex-wrap items-stretch w-full relative px-2 py-2'>
							<div className="flex -mr-px dark:bg-[#044A42] dark:text-[#B8E1DD]">
								<span className="flex items-center leading-normal rounded rounded-r-none border border-r-0 dark:border-[#3A9188] pl-[25px] pr-[26px] whitespace-no-wrap">
									SubMimir
								</span>
							</div>
							<input
								className='subredditInput flex-1 mr-2 relative bg-gray-50 p-2 outline-none border font-gilroy tracking-wide subpixel-antialiased rounded rounded-l-none dark:text-[#B8E1DD] dark:bg-[#044A42] dark:border-[#3A9188] backdrop-blur-sm'
								{...register("subreddit", { required: true })}
								type='text'
								placeholder='i.e. Next.js'
							/>
						</div>
					)}


					{/* Image */}
					{/* Checking if the imageBoxOpen state is true. If it is, it will display the div.
						If it is not, it will not display the div.
					*/}
					{imageBoxOpen && (
						<div className='flex flex-wrap items-stretch w-full relative px-2 py-2'>
							<div className="flex -mr-px dark:bg-[#044A42] dark:text-[#B8E1DD]">
								<span className="flex items-center leading-normal rounded rounded-r-none border border-r-0 dark:border-[#3A9188] pl-[20px] pr-[19px] whitespace-no-wrap">
									Image URL
								</span>
							</div>
							<input
								className=' ImageURL flex-1 mr-2 relative bg-gray-50 p-2 outline-none border font-gilroy tracking-wide subpixel-antialiased rounded rounded-l-none dark:text-[#B8E1DD] dark:bg-[#044A42] dark:border-[#3A9188] backdrop-blur-sm'
								{...register("postImage")}
								type='text'
								placeholder='Optional'
							/>
						</div>
					)}

					{/* Erros */}
					{/* Checking if there are any errors. If there are, it will display the relevant div.
						If there are not, it will not display the div.
					*/}
					{Object.keys(errors).length > 0 && (
						<div className='space-y-2 p-2 text-red-500 font-gilroy subpixel-antialiased'>
							{errors.postTitle?.type === "required" && (
								<p className=' text-xs dark:text-[#F05454]'>
									❗A Title for the post is required.
								</p>
							)}

							{errors.subreddit?.type === "required" && (
								<p className='text-xs dark:text-[#F05454]'>
									❗A Subreddit for the post is required.
								</p>
							)}
						</div>
					)}

					{/* Post Button */}
					{/* Checking if the user has typed anything in the Post Title input box.
						If they have, it will display the submit post button.
						If they have not, it will not display the button.
					*/}
					{!!watch("postTitle") && (
						<button
							type='submit'
							className='justify-center items-center align-middle drop-shadow-[0_5px_5px_rgba(184,225,221,0.09)] hover:drop-shadow-xl rounded-md p-2 my-2 mr-[19px] ml-[11px] bg-blue-400 text-white font-semibold  dark:text-[#B8E1DD] dark:bg-[#062824] dark:ring-1  dark:ring-[#3A9188] dark:shadow-lg'
						>
							Post
						</button>
					)}
				</div>
			)}
		</form>
	);
}

export default PostBox;



