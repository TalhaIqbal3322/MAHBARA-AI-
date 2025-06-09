document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const generateImageBtn = document.getElementById('generateImageBtn');
    const micButton = document.getElementById('micButton');
    const contentInput = document.getElementById('content');
    const platformSelect = document.getElementById('platform');
    const contentOutput = document.getElementById('contentOutput');
    const imageOutput = document.getElementById('imageOutput');
    const generatedContent = document.getElementById('generatedContent');
    const generatedImage = document.getElementById('generatedImage');
    const exportButtons = document.getElementById('exportButtons');
    const exportPdf = document.getElementById('exportPdf');
    const exportPpt = document.getElementById('exportPpt');

    let mediaRecorder;
    let audioChunks = [];

    // Generate content
    generateBtn.addEventListener('click', async function() {
        const text = contentInput.value;
        const platform = platformSelect.value;

        if (!text) {
            alert('Please enter some content first!');
            return;
        }

        try {
            const response = await fetch('/generate_content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, platform }),
            });

            const data = await response.json();
            contentOutput.textContent = data.content;
            generatedContent.style.display = 'block';
            exportButtons.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating content. Please try again.');
        }
    });

    // Generate image
    generateImageBtn.addEventListener('click', async function() {
        const text = contentInput.value;

        if (!text) {
            alert('Please enter some content first!');
            return;
        }

        try {
            const response = await fetch('/generate_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();
            imageOutput.src = data.image_url;
            generatedImage.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating image. Please try again.');
        }
    });

    // Voice recording functionality
    micButton.addEventListener('click', async function() {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const formData = new FormData();
                    formData.append('audio', audioBlob);

                    try {
                        const response = await fetch('https://api.assemblyai.com/v2/upload', {
                            method: 'POST',
                            headers: {
                                'Authorization': '80ecf3fef4c94ea0b3121192a95ae7c7'
                            },
                            body: formData
                        });

                        const { upload_url } = await response.json();

                        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
                            method: 'POST',
                            headers: {
                                'Authorization': '80ecf3fef4c94ea0b3121192a95ae7c7',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                audio_url: upload_url,
                                language_code: 'auto'
                            })
                        });

                        const { id } = await transcriptResponse.json();

                        // Poll for transcription completion
                        const pollInterval = setInterval(async () => {
                            const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
                                headers: {
                                    'Authorization': '80ecf3fef4c94ea0b3121192a95ae7c7'
                                }
                            });

                            const { status, text } = await statusResponse.json();

                            if (status === 'completed') {
                                clearInterval(pollInterval);
                                contentInput.value = text;
                            } else if (status === 'error') {
                                clearInterval(pollInterval);
                                alert('Error transcribing audio. Please try again.');
                            }
                        }, 1000);
                    } catch (error) {
                        console.error('Error:', error);
                        alert('Error processing audio. Please try again.');
                    }
                });

                mediaRecorder.start();
                micButton.classList.add('recording');
            } catch (error) {
                console.error('Error accessing microphone:', error);
                alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
            }
        } else {
            mediaRecorder.stop();
            micButton.classList.remove('recording');
        }
    });

    // Export as PDF
    exportPdf.addEventListener('click', async function() {
        try {
            const response = await fetch('/export_pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: contentOutput.textContent }),
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'content.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error:', error);
            alert('Error exporting PDF. Please try again.');
        }
    });

    // Export as PPT
    exportPpt.addEventListener('click', async function() {
        try {
            const response = await fetch('/export_ppt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: contentOutput.textContent }),
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'content.pptx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error:', error);
            alert('Error exporting PPT. Please try again.');
        }
    });
}); 